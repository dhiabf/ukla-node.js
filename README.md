# Node.js Recipe Video Upload API

## Overview

This Node.js application serves as a backend API for uploading recipe videos. It utilizes Azure Blob Storage for storing video files and PostgreSQL as the database to manage recipes and their associated steps.

## Table of Contents

- [Technologies Used](#technologies-used)
- [Environment Variables](#environment-variables)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [Contact](#contact)

## Technologies Used

- **Node.js**: JavaScript runtime for server-side development.
- **Express**: Web framework for Node.js to create RESTful APIs.
- **Multer**: Middleware for handling file uploads.
- **@azure/storage-blob**: Azure SDK for interacting with Blob Storage.
- **pg**: PostgreSQL client for Node.js.
- **dotenv**: Module to load environment variables from a `.env` file.

## Environment Variables

To run this application, you need to set up the following environment variables in a `.env` file. 

### `.env.example`

```plaintext
DB_USER="postgres"
DB_HOST="hostname.postgres.database.azure.com"
DB_NAME="postgres"
DB_PASSWORD=""  # Your PostgreSQL database password
DB_PORT="5432"
AZURE_STORAGE_CONNECTION_STRING="azure_connection_string"


The PostgreSQL database consists of the following tables:

1. ukla_recipes
This table stores the details of each recipe.

Column Name	Data Type	Description
recipe_id	UUID	Unique identifier for each recipe (Primary Key).
creator_id	VARCHAR	ID of the user who created the recipe.
title	VARCHAR	Title of the recipe.
video_url	VARCHAR	URL of the video stored in Azure Blob Storage.
duration	INT	Duration of the video in seconds.
created_at	TIMESTAMP	Timestamp when the recipe was created.


2. recipe_steps
This table stores the steps associated with each recipe.

Column Name	Data Type	Description
step_id	UUID	Unique identifier for each step (Primary Key).
recipe_id	UUID	ID of the recipe this step belongs to (Foreign Key).
step_number	INT	The order of the step in the recipe.
step_title	VARCHAR	Title of the step.
instructions	TEXT	Detailed instructions for the step.
