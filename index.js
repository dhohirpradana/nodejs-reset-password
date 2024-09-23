import express from "express";
import {
  passwordUpdate,
  updateUserPasswordReset,
  userByPasswordResetKey,
} from "./pocketbase.js";

const app = express();
const port = 3000;

app.use(express.json());

app.post("/key-check", (req, res) => {
  const data = req.body;
  const { key } = data;

  if (!key) {
    return res.status(402).json({ error: "key is required!" });
  }

  return userByPasswordResetKey(key, res);
});

app.post("/password-reset-send-mail", (req, res) => {
  return updateUserPasswordReset(req, res);
});

app.post("/password-reset-confirm", (req, res) => {
  return passwordUpdate(req, res);
});

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});
