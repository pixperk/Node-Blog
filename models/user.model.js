// Import necessary modules from mongoose and crypto
const { Schema, model } = require("mongoose");
const { createHmac, randomBytes } = require("crypto");
const { createTokenForUser } = require("../services/authentication");

// Define the user schema with various fields and constraints
const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true, // Full name is required
    },
    email: {
      type: String,
      required: true, // Email is required
      unique: true, // Email must be unique
    },
    salt: {
      type: String,
    },
    password: {
      type: String,
      required: true, // Password is required
    },
    profileImageURL: {
      type: String,
      default: "/images/default.png", // Default profile image URL
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"], // Role must be either USER or ADMIN
      default: "USER", // Default role is USER
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Pre-save hook to hash the password if it is modified or new
userSchema.pre("save", function (next) {
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return next();

  // Generate a random salt and hash the password using sha256
  const salt = randomBytes(16).toString();
  const hashedPassword = createHmac("sha256", salt)
    .update(user.password)
    .digest("hex");

  // Set the salt and hashed password on the user object
  this.salt = salt;
  this.password = hashedPassword;

  // Proceed to the next middleware
  next();
});

userSchema.static("matchPasswordAndGenerateToken", async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) throw new Error("User not found");

  const salt = user.salt;
  const hashedPassword = user.password;

  const userProvidedHash = createHmac("sha256", salt)
    .update(password)
    .digest("hex");

  if (hashedPassword !== userProvidedHash) throw new Error("Invalid Password");

  const token = createTokenForUser(user);
  return token;
});

// Create the User model using the userSchema
const User = model("User", userSchema);

// Export the User model for use in other parts of the application
module.exports = User;
