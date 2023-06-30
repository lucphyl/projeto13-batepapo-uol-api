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

//endpoint

// post participantes
App.post ("/participants", async (request,response) => {
    const { name } = request.body;

    const valida = ParticipantsPreset.validate(request.body, { abortEarly: false});
    if (valida.error){
        return response.status(422).send(valida.error.details.map(detail => detail.message))
    }
    try {
        //validação de participantes com mesmo nome
        const participanteRepetido = await db.collection("participants").findOne({name:name})
        if(participanteRepetido) return response.sendStatus(409);
        const marcação = Date.now()
        await db.collection("participants").insertOne({name, lastStatus: marcação})
        
        const menssagem = {
            from:name ,
            to:"Todos",
            text:"entra na sala ",
            type:"Status",
            time: dayjs(marcação).format("HH:mm:ss")
        }

        await db.collection ("messages").insertOne(menssagem)

        response.sendStatus(201);
    } catch (error) {
        response.status(500).send(error.message);
    }


    
})

App.get ("/participants", async (request,response) => {
try {
     const participantes = await db.collection ("participants").find().toArray()
    response.send(participantes);
} catch (error) {
    response.status(500).send(error.message);
}
})


// PORT
const PORT = 5000;
App.listen(PORT, () => console.log(`Servidor aberto na porta: ${PORT}`));