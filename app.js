const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

/// post user registration

app.post("/register", async (request, response) => {
  const userDetails = request.body;
  const { username, name, password, location } = userDetails;

  const hashedPassword = await bcrypt.hash(userDetails.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${userDetails.username}';`;
  const isUserThere = await db.get(selectUserQuery);

  if (isUserThere === undefined) {
    if (userDetails.password.length > 4) {
      const createUserQuery = ` 
            INSERT INTO user (username, name, password, location)
            VALUES 
                ( '${username}','${name}', '${hashedPassword}', '${location}');`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

/// post user login

app.post("/login", async (request, response) => {
  const userLoginDetails = request.body;

  const { username, password } = userLoginDetails;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const isUserThere = await db.get(selectUserQuery);

  if (isUserThere !== undefined) {
    const isPassword = await bcrypt.compare(password, isUserThere.password);
    if (isPassword === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

/// put change user current password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await db.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length > 4) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
          UPDATE
            user
          SET
            password = '${hashedPassword}'
          WHERE
            username = '${username}';`;

        const user = await db.run(updatePasswordQuery);

        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
