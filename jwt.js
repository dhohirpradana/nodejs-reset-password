import Jwt from "jsonwebtoken";
const jwt = Jwt;
import dotenv from "dotenv";

dotenv.config();

function generateJwt(userId) {
  const secretKey = process.env.JWT_SECRET || "RAHASIA_SANGAT"; // Use an environment variable for security

  const payload = {
    id: userId,
  };

  const options = {
    expiresIn: "15m",
  };

  const token = jwt.sign(payload, secretKey, options);

  return token;
}

export { generateJwt };
