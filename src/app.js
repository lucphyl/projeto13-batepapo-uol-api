import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { MongoClient } from 'mongodb'

const App = express

//config
App.use(cors());
App.use(express.json());
dotenv.config();

//schemas
App.length("/teste", (request,response) => {
    response.send("tá lá");
});

//mongo connection
const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
    await mongoClient.connect();
    console.log("conectado");
 } catch (error) {
    console.log(error.message);
 };
const db = mongoClient.db();


