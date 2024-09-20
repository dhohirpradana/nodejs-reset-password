import PocketBase from "pocketbase";
import dotenv from "dotenv";
import { generateJwt } from "./jwt.js";
import { sendMail } from "./smtp.js";

dotenv.config();

const pbUrl = process.env.PB_URL;
const pbAdminEmail = process.env.PB_ADMIN_EMAIL ?? "";
const pbAdminPassword = process.env.PB_ADMIN_PASSWORD ?? "";
const pb = new PocketBase(pbUrl);

// async function checkToken(token) {
//   try {
//     pb.authStore.save(token, null);

//     await pb.collection("users").authRefresh();

//     return token;
//   } catch (error) {
//     console.error("Error fetching current user:", error);
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// }

async function adminToken() {
  // console.log("Admin Email:", pbAdminEmail);
  // console.log("Admin Password:", pbAdminPassword);

  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);

    console.log("Admin: ", pb.authStore.isValid);
    console.log("Admin Token: ", pb.authStore.token);
    console.log(pb.authStore.model.id);

    return pb.authStore.token;
  } catch (error) {
    return null;
  }
}

async function passwordUpdate(req, res) {
  const data = req.body;

  const { email, newPass, confirmNewPass, key } = data;

  if (!email) {
    return res.status(402).json({ error: "email is required!" });
  }

  if (!isValidEmail(email)) {
    return res.status(402).json({ error: "invalid email!" });
  }

  if (!newPass) {
    return res.status(402).json({ error: "newPass is required!" });
  }

  if (!confirmNewPass) {
    return res.status(402).json({ error: "confirmNewPass is required!" });
  }

  if (!key) {
    return res.status(402).json({ error: "key is required!" });
  }

  if (newPass !== confirmNewPass) {
    return res
      .status(400)
      .json({ error: "New password and confirm new password do not match!" });
  }

  var token = await adminToken();

  const user = await userByEmail(email, res);
  const {
    id: userId,
    passwordResetKey: userPasswordResetKey,
    passwordResetTimestamp,
  } = user;

  const nowUtcSeconds = Math.floor(Date.now() / 1000);
  console.log("nowUtcSeconds: ", nowUtcSeconds);

  if (!userPasswordResetKey || passwordResetTimestamp) {
    return res
      .status(404)
      .json({ error: "Password reset link invalid or expired." });
  }

  if (
    !passwordResetTimestamp ||
    nowUtcSeconds - passwordResetTimestamp > 60 * 15
  ) {
    return res.status(404).json({ error: "Password reset link expired!" });
  }

  if (key !== userPasswordResetKey) {
    return res
      .status(404)
      .json({ error: "Password reset link invalid or expired!" });
  }

  try {
    await pb.collection("users").update(
      userId,
      {
        password: newPass,
        passwordConfirm: newPass,
        passwordResetKey: null,
        passwordResetTimestamp: null,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.status(200).json({ message: "Password updated" });
  } catch (error) {
    const errorResponse = error.response ? error.response.data : null;
    const statusCode = error.response ? error.response.status : null;

    return res.status(statusCode).json(errorResponse);
  }
}

async function userByEmail(email, res) {
  var token = await adminToken();
  try {
    const userData = await pb
      .collection("users")
      .getFirstListItem(`email="${email}"`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    // console.log(userData);
    return userData;
  } catch (error) {
    console.log(error);
    const errorResponse = error.response ?? null;
    const statusCode = error.status ?? 500;

    return res.status(statusCode).json(errorResponse);
  }
}

function isValidEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

// Send mail for Reset (KEY)
async function updateUserPasswordReset(req, res) {
  var token = await adminToken();

  const data = req.body;

  const { email } = data;

  if (!email) {
    return res.status(402).json({ error: "email is required!" });
  }

  if (!isValidEmail(email)) {
    return res.status(402).json({ error: "invalid email!" });
  }

  const user = await userByEmail(email, res);
  const userId = user.id;

  const key = generateJwt(userId);
  console.log(key);

  var userPasswordResetTimestamp = user.passwordResetTimestamp;

  const nowUtcSeconds = Math.floor(Date.now() / 1000);
  console.log("nowUtcSeconds: ", nowUtcSeconds);

  // Check if at least 1 minute has passed since the last message
  if (
    userPasswordResetTimestamp === null ||
    nowUtcSeconds - userPasswordResetTimestamp > 60
  ) {
    userPasswordResetTimestamp = nowUtcSeconds;

    try {
      const data = {
        passwordResetKey: key,
        passwordResetTimestamp: nowUtcSeconds,
      };

      await pb.collection("users").update(userId, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return sendMail(email, key, res);
    } catch (error) {
      console.log(error);
      const errorResponse = error.response ? error.response.data : null;
      const statusCode = error.response ? error.response.status : null;

      return res.status(statusCode).json(errorResponse);
    }
  } else {
    const secondsRemaining = 60 - (nowUtcSeconds - userPasswordResetTimestamp);
    return res.status(400).json({
      error: `Please wait ${secondsRemaining}s before sending another request.`,
    });
  }
}

export { passwordUpdate, updateUserPasswordReset };
