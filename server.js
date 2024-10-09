const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // Import UUID generation
require('dotenv').config(); // Load environment variables

// Initialize the Express app
const app = express();
app.use(bodyParser.json());

// PostgreSQL connection pool setup
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Azure Blob Storage setup
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = 'recipes';

// Multer setup for file upload handling
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 1024 * 1024 * 50 }, // 50 MB limit
});

// POST route to handle video and recipe upload
// POST route to handle video and recipe upload
app.post('/upload-recipe', upload.single('video'), async (req, res) => {
    try {
        const { title, creator_id, steps, duration } = req.body;

        // Validate request body
        if (!title || !creator_id || !steps || !duration) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Video file is required.' });
        }

        // Step 1: Upload video to Azure Blob Storage
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = req.file.originalname;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Read the file and upload with the correct content type
        const videoFilePath = req.file.path;
        const videoData = fs.readFileSync(videoFilePath);

        // Specify the content type as video/mp4
        const options = {
            blobHTTPHeaders: { blobContentType: 'video/mp4' } // Set the content type for streaming
        };

        await blockBlobClient.upload(videoData, videoData.length, options);

        // Get the URL of the uploaded video
        const videoUrl = blockBlobClient.url;

        // Generate a UUID for the recipe_id
        const recipeId = uuidv4();

        // Step 2: Insert the recipe into the PostgreSQL database
        const recipeQuery = `
            INSERT INTO ukla_recipes (recipe_id, creator_id, title, video_url, duration, created_at) 
            VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING recipe_id;
        `;
        const recipeResult = await pool.query(recipeQuery, [recipeId, creator_id, title, videoUrl, duration]);

        // Step 3: Insert the steps into the recipe_steps table
        const stepsData = JSON.parse(steps); // Ensure this is an array of objects
        const stepPromises = stepsData.map((step, index) => {
            const stepId = uuidv4(); // Generate a UUID for each step
            const stepQuery = `
                INSERT INTO recipe_steps (step_id, recipe_id, step_number, step_title, instructions) 
                VALUES ($1, $2, $3, $4, $5);
            `;
            return pool.query(stepQuery, [stepId, recipeId, index + 1, step.step_title, step.instructions]);
        });

        await Promise.all(stepPromises);

        // Cleanup: Remove temporary file
        fs.unlinkSync(videoFilePath);

        // Send a success response
        res.status(200).json({ message: 'Recipe uploaded successfully!', recipeId });

    } catch (error) {
        console.error('Error uploading recipe:', error);
        res.status(500).json({ message: 'Failed to upload recipe', error: error.message });
    }
});

  

// GET route to return all recipes
app.get('/recipes', async (req, res) => {
  try {
    const recipesQuery = `
      SELECT recipe_id, title, creator_id, video_url, duration, created_at 
      FROM ukla_recipes;
    `;
    const recipesResult = await pool.query(recipesQuery);
    
    res.status(200).json({ recipes: recipesResult.rows });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ message: 'Failed to fetch recipes', error: error.message });
  }
});

// GET route to return details of a specific recipe along with its steps
app.get('/recipes/:id', async (req, res) => {
  const { id } = req.params; // Extract recipe_id from URL parameters
  try {
    // Query to get recipe details
    const recipeQuery = `
      SELECT recipe_id, title, creator_id, video_url, duration, created_at 
      FROM ukla_recipes 
      WHERE recipe_id = $1;
    `;
    const recipeResult = await pool.query(recipeQuery, [id]);

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Query to get steps associated with the recipe
    const stepsQuery = `
      SELECT step_number, instructions, step_title
      FROM recipe_steps 
      WHERE recipe_id = $1 
      ORDER BY step_number;
    `;
    const stepsResult = await pool.query(stepsQuery, [id]);

    const recipe = recipeResult.rows[0];
    const steps = stepsResult.rows;

    res.status(200).json({ recipe, steps });
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    res.status(500).json({ message: 'Failed to fetch recipe details', error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
