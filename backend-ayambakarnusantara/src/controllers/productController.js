const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const { v4: uuidv4 } = require("uuid");
const {
  uploadImage,
  deleteFile,
  extractPathFromPublicUrl,
} = require("../utils/storageHelper");

function mapProduct(row) {
  if (!row) return null;
  return {
    _id: row.id,
    shopId: row.shop_id,
    ownerUID: row.owner_uid,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock: row.stock,
    category: row.category,
    productImageURL: row.product_image_url,
    name_lowercase: row.name ? row.name.toLowerCase() : null,
    sumOfRatings: Number(row.sum_of_ratings || 0),
    ratingCount: row.total_ratings || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProductList(rows) {
  return (rows || []).map(mapProduct);
}

// Batas atas input produk — disamakan dengan kapasitas kolom DB
// (price numeric(12,2) maks 9.999.999.999,99; stock int maks ~2,1 miliar),
// plus batas bisnis agar nilai ekstrem ditolak dengan 400 yang ramah,
// bukan error DB mentah berstatus 500.
const MAX_PRODUCT_PRICE = 9999999999.99;
const MAX_PRODUCT_STOCK = 999999999;
const VALID_CATEGORIES = ["Makanan", "Minuman", "Camilan"];

exports.createProduct = async (req, res) => {
  const uid = req.user?.uid;
  const { name, description, price, stock, category } = req.body;
  const normalizedCategory = String(category || "").trim();

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  if (!name || !description || !price || stock === undefined || !category) {
    return handleError(res, {
      statusCode: 400,
      message:
        "Semua field wajib diisi: nama, deskripsi, harga, stok, dan kategori.",
    });
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return handleError(res, {
      statusCode: 400,
      message: "Harga harus berupa angka positif.",
    });
  }
  if (parsedPrice > MAX_PRODUCT_PRICE) {
    return handleError(res, {
      statusCode: 400,
      message: `Harga maksimal Rp${MAX_PRODUCT_PRICE.toLocaleString("id-ID")}.`,
    });
  }

  const parsedStock = parseInt(stock);
  if (isNaN(parsedStock) || parsedStock < 0) {
    return handleError(res, {
      statusCode: 400,
      message: "Stok harus berupa angka non-negatif.",
    });
  }
  if (parsedStock > MAX_PRODUCT_STOCK) {
    return handleError(res, {
      statusCode: 400,
      message: `Stok maksimal ${MAX_PRODUCT_STOCK.toLocaleString("id-ID")} unit.`,
    });
  }

  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    return handleError(res, {
      statusCode: 400,
      message: `Kategori harus salah satu dari: ${VALID_CATEGORIES.join(", ")}.`,
    });
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", uid)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData || userData.role !== "seller") {
      return handleError(res, {
        statusCode: 403,
        message: "Hanya seller yang dapat membuat produk.",
      });
    }

    const shopId = userData.shop_id;
    if (!shopId) {
      return handleError(res, {
        statusCode: 400,
        message:
          "Seller tidak memiliki toko terkait. Silakan buat toko terlebih dahulu.",
      });
    }

    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, user_id")
      .eq("id", shopId)
      .maybeSingle();

    if (shopError) throw shopError;

    if (!shopData || shopData.user_id !== uid) {
      return handleError(res, {
        statusCode: 403,
        message:
          "Anda tidak memiliki akses ke toko ini atau toko tidak ditemukan.",
      });
    }

    let productImageURL = null;

    if (req.file) {
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `product-images/${shopId}/${uuidv4()}.${fileExtension}`;
      productImageURL = await uploadImage(
        "product-images",
        fileName,
        req.file.buffer,
        req.file.mimetype
      );
    }

    const { data: newProduct, error: insertError } = await supabaseAdmin
      .from("products")
      .insert({
        shop_id: shopId,
        owner_uid: uid,
        name,
        description,
        price: parsedPrice,
        stock: parsedStock,
        category: normalizedCategory,
        product_image_url: productImageURL,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return handleSuccess(
      res,
      201,
      "Produk berhasil ditambahkan.",
      mapProduct(newProduct)
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return handleError(res, error, "Gagal menambahkan produk.");
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const {
      searchById,
      searchByName,
      category,
      shopId,
      sortBy,
      order = "asc",
      page = 1,
      limit = 10,
      nameCaseInsensitive = "true",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const isNameSearchCaseInsensitive = nameCaseInsensitive === "true";

    let query = supabaseAdmin
      .from("products")
      .select("*", { count: "exact" });

    let isSearchingById = false;

    if (searchById) {
      query = query.eq("id", searchById);
      isSearchingById = true;
    } else {
      if (category) {
        query = query.eq("category", category);
      }

      // Filter per toko: dipakai frontend untu menampilkan "Produk lain dari
      // toko ini" di detail produk (DetailMenuPage) — agar tidak campur produk
      // dari toko lain.
      if (shopId) {
        query = query.eq("shop_id", shopId);
      }

      if (searchByName) {
        query = query.ilike("name", `%${searchByName}%`);
      }

      if (sortBy && sortBy !== "name") {
        const orderColumn =
          sortBy === "price" ? "price" : "created_at";
        query = query.order(orderColumn, { ascending: order === "asc" });
      } else if (!sortBy) {
        query = query.order("created_at", { ascending: false });
      }
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    let products = mapProductList(data);

    // Sortir nama case-insensitive dilakukan di aplikasi (seperti sebelumnya)
    if (!isSearchingById && sortBy === "name") {
      products.sort((a, b) => {
        const nameA = isNameSearchCaseInsensitive
          ? (a.name || "").toLowerCase()
          : a.name || "";
        const nameB = isNameSearchCaseInsensitive
          ? (b.name || "").toLowerCase()
          : b.name || "";
        return order === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    }

    const totalProducts = isSearchingById ? products.length : count || 0;
    const totalPages = Math.ceil(totalProducts / limitNum);

    if (products.length === 0) {
      let message = "Belum ada produk yang sesuai dengan kriteria pencarian.";
      if (isSearchingById) {
        message = "Produk dengan ID yang dicari tidak ditemukan.";
      }
      return handleSuccess(res, 200, message, {
        products: [],
        currentPage: pageNum,
        totalPages: 0,
        totalProducts: 0,
      });
    }

    return handleSuccess(res, 200, "Daftar produk berhasil diambil.", {
      products,
      currentPage: pageNum,
      totalPages,
      totalProducts,
    });
  } catch (error) {
    console.error("Error getting all products:", error);
    return handleError(res, error, "Gagal mengambil daftar produk.");
  }
};

exports.getMyProducts = async (req, res) => {
  const uid = req.user?.uid;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id")
      .eq("id", uid)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData?.shop_id) {
      return handleError(res, {
        statusCode: 404,
        message: "Toko seller tidak ditemukan.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("shop_id", userData.shop_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return handleSuccess(
        res,
        200,
        "Anda belum memiliki produk di toko Anda.",
        []
      );
    }

    return handleSuccess(
      res,
      200,
      "Daftar produk Anda berhasil diambil.",
      mapProductList(data)
    );
  } catch (error) {
    console.error("Error getting my products:", error);
    return handleError(res, error, "Gagal mengambil daftar produk Anda.");
  }
};

exports.getProductById = async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    return handleError(res, {
      statusCode: 400,
      message: "Product ID diperlukan.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return handleError(res, {
        statusCode: 404,
        message: "Produk tidak ditemukan.",
      });
    }

    return handleSuccess(
      res,
      200,
      "Detail produk berhasil diambil.",
      mapProduct(data)
    );
  } catch (error) {
    console.error("Error getting product by ID:", error);
    return handleError(res, error, "Gagal mengambil detail produk.");
  }
};

exports.updateProduct = async (req, res) => {
  const uid = req.user?.uid;
  const { productId } = req.params;
  const { name, description, price, stock, category, removeProductImage } =
    req.body;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  if (!productId) {
    return handleError(res, {
      statusCode: 400,
      message: "Product ID diperlukan.",
    });
  }

  try {
    const { data: currentProductData, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!currentProductData) {
      return handleError(res, {
        statusCode: 404,
        message: "Produk tidak ditemukan untuk diperbarui.",
      });
    }

    if (currentProductData.owner_uid !== uid) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda tidak berhak memperbarui produk ini.",
      });
    }

    const fieldsToUpdate = {};

    if (req.file) {
      if (currentProductData.product_image_url) {
        const oldPath = extractPathFromPublicUrl(
          currentProductData.product_image_url,
          "product-images"
        );
        if (oldPath) await deleteFile("product-images", oldPath);
      }
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `product-images/${currentProductData.shop_id}/${uuidv4()}.${fileExtension}`;
      fieldsToUpdate.product_image_url = await uploadImage(
        "product-images",
        fileName,
        req.file.buffer,
        req.file.mimetype
      );
    } else if (removeProductImage === "true") {
      if (currentProductData.product_image_url) {
        const oldPath = extractPathFromPublicUrl(
          currentProductData.product_image_url,
          "product-images"
        );
        if (oldPath) await deleteFile("product-images", oldPath);
      }
      fieldsToUpdate.product_image_url = null;
    }

    if (name && name.trim() !== "") {
      fieldsToUpdate.name = name.trim();
    }
    if (description && description.trim() !== "") {
      fieldsToUpdate.description = description.trim();
    }
    if (price !== undefined && price !== "") {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return handleError(res, {
          statusCode: 400,
          message: "Harga harus berupa angka positif.",
        });
      }
      if (parsedPrice > MAX_PRODUCT_PRICE) {
        return handleError(res, {
          statusCode: 400,
          message: `Harga maksimal Rp${MAX_PRODUCT_PRICE.toLocaleString("id-ID")}.`,
        });
      }
      fieldsToUpdate.price = parsedPrice;
    }
    if (stock !== undefined && stock !== "") {
      const parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return handleError(res, {
          statusCode: 400,
          message: "Stok harus berupa angka non-negatif.",
        });
      }
      if (parsedStock > MAX_PRODUCT_STOCK) {
        return handleError(res, {
          statusCode: 400,
          message: `Stok maksimal ${MAX_PRODUCT_STOCK.toLocaleString("id-ID")} unit.`,
        });
      }
      fieldsToUpdate.stock = parsedStock;
    }
    if (category && category.trim() !== "") {
      const normalizedCategory = category.trim();
      if (!VALID_CATEGORIES.includes(normalizedCategory)) {
        return handleError(res, {
          statusCode: 400,
          message: `Kategori harus salah satu dari: ${VALID_CATEGORIES.join(", ")}.`,
        });
      }
      fieldsToUpdate.category = normalizedCategory;
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return handleError(res, {
        statusCode: 400,
        message:
          "Tidak ada data yang dikirim untuk diperbarui atau data sama dengan yang sekarang.",
      });
    }

    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from("products")
      .update(fieldsToUpdate)
      .eq("id", productId)
      .select()
      .single();

    if (updateError) throw updateError;

    return handleSuccess(
      res,
      200,
      "Produk berhasil diperbarui.",
      mapProduct(updatedProduct)
    );
  } catch (error) {
    console.error("Error updating product:", error);
    return handleError(res, error, "Gagal memperbarui produk.");
  }
};

exports.deleteProduct = async (req, res) => {
  const uid = req.user?.uid;
  const { productId } = req.params;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  if (!productId) {
    return handleError(res, {
      statusCode: 400,
      message: "Product ID diperlukan.",
    });
  }

  try {
    const { data: productData, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!productData) {
      return handleError(res, {
        statusCode: 404,
        message: "Produk tidak ditemukan untuk dihapus.",
      });
    }

    if (productData.owner_uid !== uid) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda tidak berhak menghapus produk ini.",
      });
    }

    if (productData.product_image_url) {
      const imagePath = extractPathFromPublicUrl(
        productData.product_image_url,
        "product-images"
      );
      if (imagePath) await deleteFile("product-images", imagePath);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", productId);
    if (deleteError) throw deleteError;

    return handleSuccess(res, 200, "Produk berhasil dihapus.");
  } catch (error) {
    console.error("Error deleting product:", error);
    return handleError(res, error, "Gagal menghapus produk.");
  }
};

exports.getProductRecommendations = async (req, res) => {
  try {
    const { limit = 10, minSumOfRatings = 4 } = req.query;

    const numLimit = parseInt(limit, 10);
    let numMinSumOfRatings = parseInt(minSumOfRatings, 10);

    if (isNaN(numLimit) || numLimit <= 0 || numLimit > 50) {
      return handleError(res, {
        statusCode: 400,
        message:
          "Parameter 'limit' harus berupa angka positif dan tidak lebih dari 50.",
      });
    }

    if (isNaN(numMinSumOfRatings) || numMinSumOfRatings < 0) {
      numMinSumOfRatings = 4;
    }
    if (numMinSumOfRatings < 4) {
      numMinSumOfRatings = 4;
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .gte("sum_of_ratings", numMinSumOfRatings)
      .order("sum_of_ratings", { ascending: false })
      .order("total_ratings", { ascending: true })
      .limit(numLimit);

    if (error) throw error;

    const queryParamsForResponse = {
      limit: numLimit,
      minSumOfRatings: numMinSumOfRatings,
    };

    if (!data || data.length === 0) {
      return handleSuccess(
        res,
        200,
        `Tidak ada produk yang memenuhi kriteria rekomendasi (minimal sumOfRatings: ${numMinSumOfRatings}).`,
        {
          recommendations: [],
          queryParams: queryParamsForResponse,
        }
      );
    }

    const recommendedProducts = mapProductList(data);

    return handleSuccess(res, 200, "Produk rekomendasi berhasil diambil.", {
      recommendations: recommendedProducts,
      totalRecommendations: recommendedProducts.length,
      queryParams: queryParamsForResponse,
    });
  } catch (error) {
    console.error("Error getting product recommendations:", error);
    return handleError(res, error, "Gagal mengambil rekomendasi produk.");
  }
};
