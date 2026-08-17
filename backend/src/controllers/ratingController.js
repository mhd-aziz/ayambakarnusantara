const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");

function mapRating(row) {
  return {
    ratingId: row.id,
    productId: row.product_id,
    shopId: row.shop_id,
    userId: row.user_id,
    orderId: row.order_id,
    ratingValue: row.rating_value,
    reviewText: row.review_text,
    userDisplayName: row.user_display_name,
    userPhotoURL: row.user_photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRatingList(rows) {
  return (rows || []).map(mapRating);
}

function statusForRatingError(error) {
  const msg = error?.message || "";
  if (msg.includes("tidak ditemukan")) return 404;
  if (msg.includes("tidak berhak")) return 403;
  if (msg.includes("sudah memberikan rating")) return 400;
  if (msg.includes("COMPLETED atau DELIVERED")) return 403;
  if (msg.includes("tidak lengkap")) return 500;
  if (msg.includes("tidak memiliki informasi toko")) return 500;
  return 400;
}

exports.addRating = async (req, res) => {
  const userId = req.user?.uid;
  const { productId } = req.params;
  const { orderId, ratingValue, reviewText } = req.body;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!productId || !orderId || ratingValue === undefined) {
    return handleError(res, {
      statusCode: 400,
      message: "ProductId, orderId, dan ratingValue wajib diisi.",
    });
  }

  const numRatingValue = parseInt(ratingValue);
  if (isNaN(numRatingValue) || numRatingValue < 1 || numRatingValue > 5) {
    return handleError(res, {
      statusCode: 400,
      message: "RatingValue harus berupa angka antara 1 dan 5.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("add_rating", {
      p_user_id: userId,
      p_product_id: productId,
      p_order_id: orderId,
      p_rating_value: numRatingValue,
      p_review_text: reviewText || null,
    });

    if (error) throw error;

    return handleSuccess(
      res,
      201,
      "Rating berhasil ditambahkan.",
      mapRating(data)
    );
  } catch (error) {
    console.error("Error adding rating:", error);
    return handleError(
      res,
      { statusCode: statusForRatingError(error) },
      `Gagal menambahkan rating: ${error.message || "Terjadi kesalahan tidak diketahui."}`
    );
  }
};

exports.updateRating = async (req, res) => {
  const userId = req.user?.uid;
  const { ratingId } = req.params;
  const { ratingValue, reviewText } = req.body;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!ratingId || ratingValue === undefined) {
    return handleError(res, {
      statusCode: 400,
      message: "RatingId dan ratingValue wajib diisi.",
    });
  }

  const numRatingValue = parseInt(ratingValue);
  if (isNaN(numRatingValue) || numRatingValue < 1 || numRatingValue > 5) {
    return handleError(res, {
      statusCode: 400,
      message: "RatingValue harus berupa angka antara 1 dan 5.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("update_rating", {
      p_rating_id: ratingId,
      p_user_id: userId,
      p_rating_value: numRatingValue,
      p_review_text: reviewText !== undefined ? reviewText : null,
    });

    if (error) throw error;

    return handleSuccess(
      res,
      200,
      "Rating berhasil diperbarui.",
      mapRating(data)
    );
  } catch (error) {
    console.error("Error updating rating:", error);
    return handleError(
      res,
      { statusCode: statusForRatingError(error) },
      `Gagal memperbarui rating: ${error.message || "Terjadi kesalahan tidak diketahui."}`
    );
  }
};

exports.deleteRating = async (req, res) => {
  const userId = req.user?.uid;
  const { ratingId } = req.params;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!ratingId) {
    return handleError(res, {
      statusCode: 400,
      message: "RatingId wajib diisi.",
    });
  }

  try {
    const { error } = await supabaseAdmin.rpc("delete_rating", {
      p_rating_id: ratingId,
      p_user_id: userId,
    });

    if (error) throw error;

    return handleSuccess(res, 200, "Rating berhasil dihapus.");
  } catch (error) {
    console.error("Error deleting rating:", error);
    return handleError(
      res,
      { statusCode: statusForRatingError(error) },
      `Gagal menghapus rating: ${error.message || "Terjadi kesalahan tidak diketahui."}`
    );
  }
};

exports.getRatingsForProduct = async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    return handleError(res, {
      statusCode: 400,
      message: "ProductId wajib diisi.",
    });
  }

  try {
    const { data: productData, error: productError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (productError) throw productError;

    if (!productData) {
      return handleError(res, {
        statusCode: 404,
        message: "Produk tidak ditemukan.",
      });
    }

    const { data: ratingRows, error: ratingsError } = await supabaseAdmin
      .from("ratings")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (ratingsError) throw ratingsError;

    const ratings = mapRatingList(ratingRows);

    return handleSuccess(res, 200, "Rating produk berhasil diambil.", {
      productDetails: {
        _id: productData.id,
        shopId: productData.shop_id,
        name: productData.name,
        description: productData.description,
        price: Number(productData.price),
        stock: productData.stock,
        category: productData.category,
        productImageURL: productData.product_image_url,
        sumOfRatings: Number(productData.sum_of_ratings || 0),
        ratingCount: productData.total_ratings || 0,
        averageRating: Number(productData.average_rating || 0),
        createdAt: productData.created_at,
        updatedAt: productData.updated_at,
      },
      ratings,
    });
  } catch (error) {
    console.error("Error getting ratings for product:", error);
    return handleError(
      res,
      { statusCode: 500 },
      "Gagal mengambil rating produk."
    );
  }
};

exports.getRatings = async (req, res) => {
  try {
    const {
      productId,
      shopId,
      ratingValue,
      limit = "10",
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    let query = supabaseAdmin.from("ratings").select("*");

    if (productId) {
      query = query.eq("product_id", productId);
    }
    if (shopId) {
      query = query.eq("shop_id", shopId);
    }
    if (ratingValue) {
      const numRating = parseInt(ratingValue);
      if (!isNaN(numRating) && numRating >= 1 && numRating <= 5) {
        query = query.eq("rating_value", numRating);
      } else {
        return handleError(res, {
          statusCode: 400,
          message: "Parameter ratingValue tidak valid. Gunakan angka 1-5.",
        });
      }
    }

    const validSortOrder = sortOrder.toLowerCase() === "asc" ? "asc" : "desc";
    const validSortBy = ["created_at", "rating_value"].includes(sortBy)
      ? sortBy
      : "created_at";
    query = query.order(validSortBy, { ascending: validSortOrder === "asc" });

    const numLimit = parseInt(limit, 10);
    query = query.limit(isNaN(numLimit) || numLimit <= 0 ? 10 : numLimit);

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return handleSuccess(res, 200, "Tidak ada rating yang ditemukan.", {
        ratings: [],
        nextCursor: null,
      });
    }

    const ratings = mapRatingList(data);
    const nextCursor = null; // pagination kursor tidak dipakai frontend

    return handleSuccess(res, 200, "Rating berhasil diambil.", {
      ratings,
      nextCursor,
    });
  } catch (error) {
    console.error("Error getting public ratings:", error);
    return handleError(
      res,
      { statusCode: 500 },
      "Gagal mengambil data rating."
    );
  }
};
