const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");

exports.createFeedback = async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return handleError(res, {
      statusCode: 400,
      message: "Nama, email, dan pesan wajib diisi.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return handleError(res, {
      statusCode: 400,
      message: "Format email tidak valid.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .insert({
        name,
        email,
        subject: subject || "Tanpa Subjek",
        message,
        status: "new",
      })
      .select()
      .single();

    if (error) throw error;

    const newFeedbackData = {
      feedbackId: data.id,
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
    };

    return handleSuccess(
      res,
      201,
      "Terima kasih! Feedback Anda telah kami terima.",
      newFeedbackData
    );
  } catch (error) {
    console.error("Error creating feedback:", error);
    return handleError(res, error, "Gagal mengirim feedback.");
  }
};
