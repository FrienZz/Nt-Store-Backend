const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const app = express();
const userRoutes = require("./routes/user");
const roleRoutes = require("./routes/role");
const bookRoutes = require("./routes/book");
const categoryRoutes = require("./routes/category");
const publisherRoutes = require("./routes/publisher");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");

dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/users", userRoutes);
app.use("/roles", roleRoutes);
app.use("/books", bookRoutes);
app.use("/categories", categoryRoutes);
app.use("/publishers", publisherRoutes);
app.use("/carts", cartRoutes);
app.use("/orders", orderRoutes);

async function connectDb() {
  await mongoose.connect(process.env.MONGODB_URL);
}

connectDb().catch((err) => {
  console.log(err);
});

app.listen(process.env.PORT, () => {
  console.log(`Example app listening at http://localhost:${process.env.PORT}`);
});
