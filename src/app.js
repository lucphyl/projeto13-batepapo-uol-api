import cors from "cors";
import dayjs from "dayjs";
import dotenv from "dotenv";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";

const App = express();

//config
App.use(cors());
App.use(express.json());
dotenv.config();

// Schemas
const ParticipantsPreset = joi.object({name: joi.string().required()} );
const messagePreset = joi.object({
    from: joi.string().required(),
    type: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required()
});


// mongo connection 
const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
    await mongoClient.connect()
    console.log('Mongo tá on')
} catch (error) {
    console.log(error.message)
}

const db = mongoClient.db();



// PORT
const PORT = 5000;
App.listen(PORT, () => console.log(`Servidor aberto na porta: ${PORT}`));