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
const ParticipantsPreset = joi.object({name: joi.string().requestuired()} );
const messagePreset = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid("message", "private_message")
    
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

// post e get participantes
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
            from:name,
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


    
});

App.get ("/participants", async (request,response) => {
try {
     const participantes = await db.collection ("participants").find().toArray()
    response.send(participantes);
} catch (error) {
    response.status(500).send(error.message);
}
});

// post e get menssagens 
App.post("/messages", async (request, response) => {
    const { user } = request.headers

    const validar = messagePreset.validate({ ...request.body, from: user }, { abortEarly: false })
    if (validar.error) {
        return response.status(422).send(validar.error.details.map(detail => detail.message))
    }

    try {
        const participante = await db.collection("participants").findOne({ name: user })
        if (!participante) return response.sendStatus(422)

        const message = { ...request.body, from: user, time: dayjs().format("HH:mm:ss") }
        await db.collection("messages").insertOne(message)
        response.sendStatus(201)

    } catch (error) {
        response.status(500).send(error.message)
    }
})

App.get("/messages", async (request, response) => {
    const { user } = request.headers

    const { limit } = request.query
    const limitNumber = Number(limit)

    if (limit !== undefined && (limitNumber <= 0 || isNaN(limitNumber))) return response.sendStatus(422)

    try {
        const messages = await db.collection("messages")
            .find({ $or: [{ from: user }, { to: { $in: ["Todos", user] } }, { type: "message" }] })
            .sort(({ $natural: -1 }))
            .limit(limit === undefined ? 0 : limitNumber)
            .toArray()

        response.send(messages)
    } catch (error) {
        response.status(500).send(err.message)
    }

});

// post status
App.post ("/status", async (requestuest,response) => {
    const {user} =  requestuest.headers;

    if (!user) return response.sendStatus(404);

    

    try{
        const participante =  await db.collection("participants").findOne({name: user})
        if (!participante) return response.sendStatus(404);

        const updateUser = await db.collection("participants").updateOne(
            {name: user}, { $set: { lastStatus: Date.now()}}
        )

        response.sendStatus(200);

    } catch (error){
        response.status(500).send(error.message)
    }
})

//removendo usuario inativo
setInterval(async () =>{
    const dezsec = Date.now() - 10000
    try {
        const inativos = await db.collection("participants").find({lastStatus: {$lt: dezsec}}).toArray()

        if (inativos.length > 0) {
            const menssagem = inativos.map( inativos => {
                return {
                    from: inativos.name,
                    to: "todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss")
                }
            })

            await db.collection("messages").insertMany(menssagem)
            await db.collection("participants").deleteMany({lastStatus: { $lt: dezsec}})
        }

    } catch (error){
        response.status(500).send(error.message);
    }
})


// PORT
const PORT = 5000;
App.listen(PORT, () => console.log(`Servidor aberto na porta: ${PORT}`));