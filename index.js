const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken")

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "simpleproject.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer(); 

// Authentication 

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
  
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
  
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid Access Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid Access Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    }
  };

// Register API 

app.post("/users/", async (request, response) => {
    const { username, password, email} = request.body;
    const hashedPassword = await bcrypt.hash(request.body.password, 10);
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `
        INSERT INTO 
          users (username, password, email) 
        VALUES 
          (
            '${username}', 
            '${hashedPassword}', 
            '${email}'
          )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`Created new user with ${newUserId}`);
    } else {
      response.status = 400;
      response.send("User already exists");
    }
  }); 


  // Login API 

  app.post("/login", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const payload = {
            username: username,
          };
          const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
          response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  }); 

  // CRUD operations 

// GET API 1

app.get("/assignment", authenticateToken, async(request, response) => {
    const getAssignmnetsQuery = `
    SELECT 
    * 
    FROM 
    student_assignment 
    ORDER BY 
    student_id;
    `;
    const assignmentQuery = await db.all(getAssignmnetsQuery);
    response.send(assignmentQuery)
}) 

// GET assignment API 2

app.get("/assignment/:student_id", authenticateToken, async (request, response) => {
    const { student_id } = request.params;
    const getNoteQuery = `
    SELECT * FROM student_assignment WHERE student_id = ${student_id};
    `;
    const dbQuery = await db.get(getNoteQuery);
    response.send(dbQuery);
  });
  

// ADD assignmnet API 3

app.post("/assignment",authenticateToken, async (request, response) => {
    const noteDetails = request.body;
    const { studentId, title, description, status } = noteDetails;
    const createNoteQuery = `
    INSERT INTO 
    student_assignment(student_id, title, description, status) 
    VALUES 
    (
        "${studentId}",
        "${title}",
        "${description}",
        "${status}"
    );
    `;
    const dbResponse = await db.run(createNoteQuery);
    response.send("Note Created Successfully");
  });
  
// PUT assignment API 4 

app.put("/assignment/:student_id", authenticateToken, async (request, response) => {
    const { student_id } = request.params;
    const noteDetails = request.body;
    const { title, description, status } = noteDetails;

    const updateAssignmentQuery = `
      UPDATE 
        student_assignment 
      SET 
        title = '${title}', 
        description = '${description}', 
        status = '${status}'
      WHERE 
        student_id = '${student_id}';
    `;
    
    await db.run(updateAssignmentQuery);
    response.send("Note Updated Successfully");
  }); 

  // DELETE assignmnet API 5 

  app.delete("/assignment/:student_id/", authenticateToken, async (request, response) => {
    const { student_id } = request.params;
    const deleteNoteQuery = `
      DELETE FROM 
      student_assignment 
      WHERE 
      student_id = ${student_id};
      `;
    await db.run(deleteNoteQuery);
    response.send("Note Deleted Successfully");
  });