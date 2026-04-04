
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  console.log(
    "AUTH DEBUG — token received:",
    token ? token.slice(0, 30) + "..." : "NONE",
  );
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("AUTH DEBUG — decoded:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("AUTH DEBUG — jwt.verify failed:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
};