const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");

function emptyCart(userId) {
  return {
    userId,
    items: [],
    totalPrice: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapCart(row, userId) {
  if (!row) return emptyCart(userId);
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    userId: row.user_id,
    items,
    totalPrice: items.reduce((t, i) => t + (Number(i.subtotal) || 0), 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCartRow(userId) {
  const { data, error } = await supabaseAdmin
    .from("carts")
    .select("user_id, items, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function saveCart(userId, items) {
  const { error } = await supabaseAdmin.from("carts").upsert(
    { user_id: userId, items },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

exports.addItemToCart = async (req, res) => {
  const userId = req.user?.uid;
  const { productId, quantity } = req.body;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  if (!productId || !quantity) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Produk dan jumlah kuantitas diperlukan.",
    });
  }

  const numQuantity = parseInt(quantity);
  if (isNaN(numQuantity) || numQuantity <= 0) {
    return handleError(res, {
      statusCode: 400,
      message: "Kuantitas harus berupa angka positif.",
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

    if (productData.stock < numQuantity) {
      return handleError(res, {
        statusCode: 400,
        message: `Stok produk tidak mencukupi. Sisa stok: ${productData.stock}.`,
      });
    }

    const cartRow = await getCartRow(userId);
    const items = cartRow?.items ? [...cartRow.items] : [];
    const itemIndex = items.findIndex((item) => item.productId === productId);

    if (itemIndex > -1) {
      const existingItem = items[itemIndex];
      const newQuantityForItem = existingItem.quantity + numQuantity;

      if (productData.stock < newQuantityForItem) {
        return handleError(res, {
          statusCode: 400,
          message: `Stok produk tidak mencukupi untuk total kuantitas yang diminta. Sisa stok: ${productData.stock}, di keranjang: ${existingItem.quantity}.`,
        });
      }
      existingItem.quantity = newQuantityForItem;
      existingItem.subtotal = existingItem.price * existingItem.quantity;
    } else {
      items.push({
        productId,
        shopId: productData.shop_id,
        name: productData.name,
        price: Number(productData.price),
        quantity: numQuantity,
        productImageURL: productData.product_image_url || null,
        subtotal: Number(productData.price) * numQuantity,
      });
    }

    await saveCart(userId, items);

    const saved = await getCartRow(userId);
    return handleSuccess(
      res,
      200,
      "Produk berhasil ditambahkan ke keranjang.",
      mapCart(saved, userId)
    );
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return handleError(res, error, "Gagal menambahkan produk ke keranjang.");
  }
};

exports.getCart = async (req, res) => {
  const userId = req.user?.uid;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    const cartRow = await getCartRow(userId);

    if (!cartRow || !Array.isArray(cartRow.items) || cartRow.items.length === 0) {
      return handleSuccess(res, 200, "Keranjang Anda kosong.", emptyCart(userId));
    }

    return handleSuccess(
      res,
      200,
      "Data keranjang berhasil diambil.",
      mapCart(cartRow, userId)
    );
  } catch (error) {
    console.error("Error getting cart:", error);
    return handleError(res, error, "Gagal mengambil data keranjang.");
  }
};

exports.updateItemQuantity = async (req, res) => {
  const userId = req.user?.uid;
  const { productId } = req.params;
  const { newQuantity } = req.body;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  if (!productId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Produk diperlukan.",
    });
  }

  const numNewQuantity = parseInt(newQuantity);
  if (isNaN(numNewQuantity) || numNewQuantity < 0) {
    return handleError(res, {
      statusCode: 400,
      message: "Kuantitas baru harus berupa angka non-negatif.",
    });
  }

  try {
    const cartRow = await getCartRow(userId);

    if (!cartRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Keranjang tidak ditemukan.",
      });
    }

    const items = [...cartRow.items];
    const itemIndex = items.findIndex((item) => item.productId === productId);

    if (itemIndex === -1) {
      return handleError(res, {
        statusCode: 404,
        message: "Produk tidak ditemukan di dalam keranjang.",
      });
    }

    if (numNewQuantity === 0) {
      items.splice(itemIndex, 1);
    } else {
      const { data: productData, error: productError } = await supabaseAdmin
        .from("products")
        .select("stock")
        .eq("id", productId)
        .maybeSingle();

      if (productError) throw productError;

      if (!productData) {
        items.splice(itemIndex, 1);
        await saveCart(userId, items);
        return handleError(res, {
          statusCode: 404,
          message: "Produk asli tidak ditemukan, item dihapus dari keranjang.",
        });
      }

      if (productData.stock < numNewQuantity) {
        return handleError(res, {
          statusCode: 400,
          message: `Stok produk tidak mencukupi. Sisa stok: ${productData.stock}.`,
        });
      }

      const itemToUpdate = items[itemIndex];
      itemToUpdate.quantity = numNewQuantity;
      itemToUpdate.subtotal = itemToUpdate.price * numNewQuantity;
    }

    await saveCart(userId, items);

    const saved = await getCartRow(userId);
    return handleSuccess(
      res,
      200,
      "Kuantitas produk di keranjang berhasil diperbarui.",
      mapCart(saved, userId)
    );
  } catch (error) {
    console.error("Error updating item quantity:", error);
    return handleError(res, error, "Gagal memperbarui kuantitas produk.");
  }
};

exports.removeItemFromCart = async (req, res) => {
  const userId = req.user?.uid;
  const { productId } = req.params;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!productId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Produk diperlukan.",
    });
  }

  try {
    const cartRow = await getCartRow(userId);

    if (!cartRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Keranjang tidak ditemukan.",
      });
    }

    const items = [...cartRow.items];
    const initialItemCount = items.length;
    const filtered = items.filter((item) => item.productId !== productId);

    if (filtered.length === initialItemCount) {
      return handleError(res, {
        statusCode: 404,
        message: "Produk tidak ditemukan di dalam keranjang untuk dihapus.",
      });
    }

    await saveCart(userId, filtered);

    const saved = await getCartRow(userId);
    return handleSuccess(
      res,
      200,
      "Produk berhasil dihapus dari keranjang.",
      mapCart(saved, userId)
    );
  } catch (error) {
    console.error("Error removing item from cart:", error);
    return handleError(res, error, "Gagal menghapus produk dari keranjang.");
  }
};

exports.clearCart = async (req, res) => {
  const userId = req.user?.uid;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    const cartRow = await getCartRow(userId);
    const createdAt =
      cartRow?.created_at || new Date().toISOString();

    await saveCart(userId, []);

    return handleSuccess(res, 200, "Keranjang berhasil dikosongkan.", {
      userId,
      items: [],
      totalPrice: 0,
      createdAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return handleError(res, error, "Gagal mengosongkan keranjang.");
  }
};
