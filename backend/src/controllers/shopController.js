const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const { v4: uuidv4 } = require("uuid");
const {
  uploadImage,
  deleteFile,
  extractPathFromPublicUrl,
} = require("../utils/storageHelper");

function mapShop(row) {
  if (!row) return null;
  return {
    shopId: row.id,
    shopName: row.shop_name,
    description: row.description,
    shopAddress: row.shop_address,
    bannerImageURL: row.banner_image_url,
    shopName_lowercase: row.shop_name ? row.shop_name.toLowerCase() : null,
    ownerUID: row.user_id,
    totalSumOfRatings: Number(row.sum_of_ratings || 0),
    totalRatingCount: row.total_ratings || 0,
    averageShopRating: Number(row.average_rating || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatShopObject(row, ownerName) {
  if (!row) return null;
  const shop = mapShop(row);
  return {
    shopId: shop.shopId,
    shopName: shop.shopName,
    description: shop.description,
    shopAddress: shop.shopAddress,
    bannerImageURL: shop.bannerImageURL,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
    ownerName: ownerName || "Nama Pemilik Tidak Tersedia",
    ownerUID: shop.ownerUID,
  };
}

async function getShopByOwner(uid) {
  const { data, error } = await supabaseAdmin
    .from("shops")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

exports.createShop = async (req, res) => {
  const uid = req.user?.uid;
  const { description } = req.body;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  if (!description) {
    return handleError(res, {
      statusCode: 400,
      message: "Deskripsi toko harus diisi.",
    });
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData) {
      return handleError(res, {
        statusCode: 404,
        message: "Data pengguna tidak ditemukan.",
      });
    }

    const existingShop = await getShopByOwner(uid);
    if (existingShop) {
      return handleError(res, {
        statusCode: 400,
        message: "Anda sudah memiliki toko. Silakan kelola toko yang ada.",
      });
    }

    const shopNameFromProfile =
      userData.display_name || "Toko Milik " + userData.email.split("@")[0];
    const shopAddressFromProfile = userData.address || null;
    let initialBannerImageURL = userData.photo_url || null;

    if (req.file) {
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `shop-banners/${uid}/${uuidv4()}.${fileExtension}`;
      initialBannerImageURL = await uploadImage(
        "shop-banners",
        fileName,
        req.file.buffer,
        req.file.mimetype
      );
    }

    const { data: newShop, error: insertError } = await supabaseAdmin
      .from("shops")
      .insert({
        user_id: uid,
        shop_name: shopNameFromProfile,
        description,
        shop_address: shopAddressFromProfile,
        banner_image_url: initialBannerImageURL,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // User menjadi seller + tercatat shop_id-nya
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "seller", shop_id: newShop.id })
      .eq("id", uid);

    if (profileError) throw profileError;

    return handleSuccess(
      res,
      201,
      "Toko berhasil dibuat. Selamat berjualan!",
      {
        ...formatShopObject(newShop, userData.display_name),
        ownerProfile: {
          uid,
          displayName: userData.display_name,
          photoURL: userData.photo_url,
        },
      }
    );
  } catch (error) {
    console.error("Error creating shop:", error);
    return handleError(res, error, "Gagal membuat toko.");
  }
};

exports.updateShop = async (req, res) => {
  const uid = req.user?.uid;
  const { shopName, description, shopAddress, removeBannerImage } = req.body;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData || userData.role !== "seller") {
      return handleError(res, {
        statusCode: 403,
        message: "Hanya seller yang dapat memperbarui toko.",
      });
    }

    const currentShopData = await getShopByOwner(uid);

    if (!currentShopData) {
      return handleError(res, {
        statusCode: 404,
        message: "Toko tidak ditemukan untuk diperbarui.",
      });
    }

    const fieldsToUpdateShop = {};
    const fieldsToUpdateProfile = {};

    if (req.file) {
      if (currentShopData.banner_image_url) {
        const oldPath = extractPathFromPublicUrl(
          currentShopData.banner_image_url,
          "shop-banners"
        );
        if (oldPath) await deleteFile("shop-banners", oldPath);
      }
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `shop-banners/${uid}/${uuidv4()}.${fileExtension}`;
      const newBannerImageURL = await uploadImage(
        "shop-banners",
        fileName,
        req.file.buffer,
        req.file.mimetype
      );
      fieldsToUpdateShop.banner_image_url = newBannerImageURL;
      if (newBannerImageURL !== userData.photo_url) {
        fieldsToUpdateProfile.photo_url = newBannerImageURL;
        if (
          userData.photo_url &&
          userData.photo_url !== currentShopData.banner_image_url
        ) {
          const oldProfilePath = extractPathFromPublicUrl(
            userData.photo_url,
            "profile-images"
          );
          if (oldProfilePath) await deleteFile("profile-images", oldProfilePath);
        }
      }
    } else if (removeBannerImage === "true" || removeBannerImage === true) {
      if (currentShopData.banner_image_url) {
        const oldPath = extractPathFromPublicUrl(
          currentShopData.banner_image_url,
          "shop-banners"
        );
        if (oldPath) await deleteFile("shop-banners", oldPath);
      }
      fieldsToUpdateShop.banner_image_url = null;
      if (userData.photo_url === currentShopData.banner_image_url) {
        fieldsToUpdateProfile.photo_url = null;
      }
    }

    if (shopName !== undefined) {
      const trimmedShopName = shopName.trim();
      if (trimmedShopName === "") {
        return handleError(res, {
          statusCode: 400,
          message: "Nama toko tidak boleh kosong.",
        });
      }
      if (trimmedShopName !== currentShopData.shop_name) {
        fieldsToUpdateShop.shop_name = trimmedShopName;
        if (trimmedShopName !== userData.display_name) {
          fieldsToUpdateProfile.display_name = trimmedShopName;
        }
      }
    }

    if (
      description !== undefined &&
      description.trim() !== currentShopData.description
    ) {
      fieldsToUpdateShop.description = description.trim();
    }

    if (
      shopAddress !== undefined &&
      shopAddress !== currentShopData.shop_address
    ) {
      fieldsToUpdateShop.shop_address = shopAddress;
      if (shopAddress !== userData.address) {
        fieldsToUpdateProfile.address = shopAddress;
      }
    }

    if (
      Object.keys(fieldsToUpdateShop).length === 0 &&
      Object.keys(fieldsToUpdateProfile).length === 0
    ) {
      return handleError(res, {
        statusCode: 400,
        message:
          "Tidak ada data yang dikirim untuk diperbarui atau data sama dengan yang sekarang.",
      });
    }

    const { data: updatedShop, error: updateError } = await supabaseAdmin
      .from("shops")
      .update(fieldsToUpdateShop)
      .eq("id", currentShopData.id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (Object.keys(fieldsToUpdateProfile).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(fieldsToUpdateProfile)
        .eq("id", uid);
      if (profileError) throw profileError;

      // Sinkronkan nama tampilan ke metadata auth
      if (fieldsToUpdateProfile.display_name) {
        await supabaseAdmin.auth.admin
          .updateUserById(uid, {
            user_metadata: {
              ...(userData.meta || {}),
              display_name: fieldsToUpdateProfile.display_name,
            },
          })
          .catch((authErr) =>
            console.warn("Gagal sinkron displayName ke auth:", authErr.message)
          );
      }
    }

    const formattedShop = {
      shopId: updatedShop.id,
      shopName: updatedShop.shop_name,
      description: updatedShop.description,
      shopAddress: updatedShop.shop_address,
      bannerImageURL: updatedShop.banner_image_url,
      createdAt: updatedShop.created_at,
      updatedAt: updatedShop.updated_at,
      shopName_lowercase: updatedShop.shop_name
        ? updatedShop.shop_name.toLowerCase()
        : null,
    };

    let message = "Toko berhasil diperbarui.";
    if (Object.keys(fieldsToUpdateProfile).length > 0) {
      message = "Toko dan profil pengguna terkait berhasil diperbarui.";
    }

    return handleSuccess(res, 200, message, formattedShop);
  } catch (error) {
    console.error("Error updating shop and user profile:", error);
    return handleError(
      res,
      error,
      "Gagal memperbarui toko dan profil terkait."
    );
  }
};

exports.getMyShop = async (req, res) => {
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
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData || userData.role !== "seller") {
      return handleError(res, {
        statusCode: 403,
        message: "Akses ditolak. Hanya untuk seller.",
      });
    }

    const shopData = await getShopByOwner(uid);

    if (!shopData) {
      return handleError(res, {
        statusCode: 404,
        message: "Toko tidak ditemukan. Anda mungkin belum membuat toko.",
      });
    }

    return handleSuccess(
      res,
      200,
      "Data toko berhasil diambil.",
      mapShop(shopData)
    );
  } catch (error) {
    console.error("Error getting my shop:", error);
    return handleError(res, error, "Gagal mengambil data toko.");
  }
};

exports.deleteShop = async (req, res) => {
  const uid = req.user?.uid;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    console.log(`[deleteShop] UID: ${uid} - Memulai proses penghapusan toko.`);
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", uid)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData || userData.role !== "seller") {
      return handleError(res, {
        statusCode: 403,
        message: "Hanya seller yang dapat menghapus toko.",
      });
    }

    const shopData = await getShopByOwner(uid);
    if (!shopData) {
      return handleError(res, {
        statusCode: 404,
        message: "Toko tidak ditemukan untuk dihapus.",
      });
    }

    // 1. Hapus file gambar produk (perbaikan: file tidak meninggalkan sampah)
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("product_image_url")
      .eq("shop_id", shopData.id);

    if (products && products.length > 0) {
      for (const p of products) {
        if (p.product_image_url) {
          const path = extractPathFromPublicUrl(
            p.product_image_url,
            "product-images"
          );
          if (path) await deleteFile("product-images", path);
        }
      }
    }

    // 2. Hapus banner toko
    if (shopData.banner_image_url) {
      const bannerPath = extractPathFromPublicUrl(
        shopData.banner_image_url,
        "shop-banners"
      );
      if (bannerPath) await deleteFile("shop-banners", bannerPath);
    }

    // 3. Hapus toko (produk + rating ikut terhapus via FK CASCADE)
    const { error: deleteError } = await supabaseAdmin
      .from("shops")
      .delete()
      .eq("id", shopData.id);
    if (deleteError) throw deleteError;

    // 4. User kembali jadi customer
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "customer", shop_id: null })
      .eq("id", uid);
    if (profileError) throw profileError;

    console.log(
      `[deleteShop] UID: ${uid} - Toko ${shopData.id} berhasil dihapus, status kembali ke customer.`
    );
    return handleSuccess(
      res,
      200,
      "Toko dan semua produk terkait berhasil dihapus. Status Anda telah diubah kembali menjadi customer."
    );
  } catch (error) {
    console.error(
      `[deleteShop] UID: ${uid} - Terjadi error umum selama proses deleteShop:`,
      error
    );
    return handleError(
      res,
      error,
      "Gagal menghapus toko karena kesalahan tak terduga."
    );
  }
};

exports.listShops = async (req, res) => {
  try {
    const {
      searchById,
      searchByShopName,
      sortBy,
      order = "asc",
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin.from("shops").select("*", { count: "exact" });
    let isSearchingById = false;

    if (searchById) {
      query = query.eq("id", searchById);
      isSearchingById = true;
    } else {
      if (searchByShopName) {
        query = query.ilike("shop_name", `%${searchByShopName}%`);
      }

      if (sortBy && sortBy !== "shopName" && sortBy !== "shopName_lowercase") {
        const orderColumn = sortBy === "createdAt" ? "created_at" : sortBy;
        query = query.order(orderColumn, { ascending: order === "asc" });
      } else if (!sortBy) {
        query = query.order("created_at", { ascending: false });
      }
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data: shopRows, count, error } = await query;

    if (error) throw error;

    let shops = (shopRows || []).map(mapShop);

    // Sortir nama case-insensitive di aplikasi (seperti sebelumnya)
    if (!isSearchingById && (sortBy === "shopName" || sortBy === "shopName_lowercase")) {
      shops.sort((a, b) => {
        const nameA = (a.shopName || "").toLowerCase();
        const nameB = (b.shopName || "").toLowerCase();
        return order === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    }

    // Ambil nama pemilik dari profiles
    const ownerIds = [...new Set(shops.map((s) => s.ownerUID).filter(Boolean))];
    const ownerCache = {};
    if (ownerIds.length > 0) {
      const { data: owners } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, photo_url")
        .in("id", ownerIds);
      (owners || []).forEach((o) => {
        ownerCache[o.id] = o.display_name || "Nama Pemilik Tidak Tersedia";
      });
    }

    const formattedShops = shops.map((shop) =>
      formatShopObject(
        {
          id: shop.shopId,
          shop_name: shop.shopName,
          description: shop.description,
          shop_address: shop.shopAddress,
          banner_image_url: shop.bannerImageURL,
          user_id: shop.ownerUID,
          created_at: shop.createdAt,
          updated_at: shop.updatedAt,
        },
        ownerCache[shop.ownerUID]
      )
    );

    const totalShops = isSearchingById ? formattedShops.length : count || 0;
    const totalPages = Math.ceil(totalShops / limitNum);

    if (formattedShops.length === 0) {
      let message = "Belum ada toko yang sesuai dengan kriteria pencarian.";
      if (isSearchingById) {
        message = "Toko dengan ID yang dicari tidak ditemukan.";
      }
      return handleSuccess(res, 200, message, {
        shops: [],
        currentPage: pageNum,
        totalPages: 0,
        totalShops: 0,
      });
    }

    return handleSuccess(res, 200, "Daftar toko berhasil diambil.", {
      shops: formattedShops,
      currentPage: pageNum,
      totalPages,
      totalShops,
    });
  } catch (error) {
    console.error("Error listing shops:", error);
    return handleError(res, error, "Gagal mengambil daftar toko.");
  }
};

exports.getShopDetails = async (req, res) => {
  const { shopId } = req.params;

  if (!shopId) {
    return handleError(res, {
      statusCode: 400,
      message: "Shop ID diperlukan.",
    });
  }

  try {
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .maybeSingle();

    if (shopError) throw shopError;

    if (!shopData) {
      return handleError(res, {
        statusCode: 404,
        message: "Toko tidak ditemukan.",
      });
    }

    let ownerName = "Nama Pemilik Tidak Tersedia";
    let ownerProfile = null;

    if (shopData.user_id) {
      const { data: ownerUser } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, photo_url")
        .eq("id", shopData.user_id)
        .maybeSingle();

      if (ownerUser) {
        ownerName = ownerUser.display_name || ownerName;
        ownerProfile = {
          uid: ownerUser.id,
          displayName: ownerUser.display_name,
          photoURL: ownerUser.photo_url,
        };
      }
    }

    const { data: productRows, error: productsError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (productsError) throw productsError;

    const products = (productRows || []).map((p) => ({
      productId: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      stock: p.stock,
      imageUrl: p.product_image_url,
      category: p.category,
      createdAt: p.created_at,
    }));

    const formattedShopData = formatShopObject(shopData, ownerName);

    return handleSuccess(res, 200, "Detail toko berhasil diambil.", {
      shop: formattedShopData,
      owner: ownerProfile,
      products,
    });
  } catch (error) {
    console.error(`Error getting shop details for shopId ${shopId}:`, error);
    return handleError(res, error, "Gagal mengambil detail toko.");
  }
};

exports.getShopStatistics = async (req, res) => {
  const uid = req.user?.uid;
  const { period = "all_time" } = req.query;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
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
        message: "Hanya seller yang dapat mengakses statistik toko.",
      });
    }

    const shopId = userData.shop_id;
    if (!shopId) {
      return handleError(res, {
        statusCode: 404,
        message: "Toko tidak ditemukan untuk seller ini.",
      });
    }

    const { count: totalProducts, error: countError } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);
    if (countError) throw countError;

    let ordersQuery = supabaseAdmin
      .from("orders")
      .select("*")
      .contains("shop_ids", [shopId]);

    const now = new Date();
    let startDate;

    if (period === "daily") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === "weekly") {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (period === "monthly") {
      startDate = new Date(now.setDate(now.getDate() - 30));
    }

    if (startDate) {
      ordersQuery = ordersQuery.gte("created_at", startDate.toISOString());
    }

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    let totalRevenue = 0;
    let newOrdersCount = 0;
    let completedOrdersCount = 0;

    (orders || []).forEach((orderData) => {
      if (
        orderData.items &&
        orderData.items.some((item) => item.shopId === shopId)
      ) {
        newOrdersCount++;

        if (orderData.order_status === "COMPLETED") {
          completedOrdersCount++;
          totalRevenue += Number(orderData.total_price);
        }
      }
    });

    const statistics = {
      period,
      totalProducts: totalProducts || 0,
      newOrders: {
        count: newOrdersCount,
        description: `Total pesanan yang masuk dalam periode ini.`,
      },
      completedOrders: {
        count: completedOrdersCount,
        description: `Pesanan yang telah selesai dalam periode ini.`,
      },
      revenue: {
        amount: totalRevenue,
        formatted: new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(totalRevenue),
        description: "Total pendapatan dari pesanan yang telah selesai.",
      },
    };

    return handleSuccess(
      res,
      200,
      "Statistik toko berhasil diambil.",
      statistics
    );
  } catch (error) {
    console.error("Error getting shop statistics:", error);
    return handleError(res, error, "Gagal mengambil statistik toko.");
  }
};
