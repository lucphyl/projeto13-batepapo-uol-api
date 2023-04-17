import express from 'express';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import joi from 'joi';
import { MongoClient } from 'mongodb';

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
const app = express();
app.use(express.json());

//validação de minimo de caracteres no nick
const validaParticipante = joi.object({
    name: joi.string().required().min(2),
});

const validaMensagem = joi.object({
    from: joi.string().required(),
    to: joi.string().required().min(1),
    text: joi.string().required().min(1),
    type:joi.string().required().valid("message", "private_message"),
    time: joi.string(),
});

try {
    await mongoClient.connect();
    console.log("conectado");
}

catch(error) {
    console.log(error);
}

//variaveis globais
const db = mongoClient.db();
const listaParticipants = db.collection("participants");
const listaMessages = db.collection('messages');


// "/participants"
app.post("/participants", async (request, resposta) => {
    const {name} =  request.body;

    const {error} = validaParticipante.validate({name}, {abortEarly: false} );

    if (error) {
        const erros = error.details.map(detail => detail.message) 
        return resposta.status(422).send(erros);
    }

    try{
        //validação de usuario repetido
        const usuarioDuplicado = await listaParticipants.findOne({name:name});
        if (usuarioDuplicado){
            return resposta.sendStatus(409);
        }
        //salva status online ( data )
        await listaParticipants.insertOne({name, lastStatus: Date.now()});
        await listaMessages.insertOne({
            from: name,
            to: "todos",
            text: "logou, uhuu!!!",
            type: "status",
            time: dayjs().format("HH:MM:SS"),
        } );

        resposta.sendStatus(201);
    }

    catch(erro){
        console.log(erro);
        resposta.sendStatus(500);
    }
});

app.get("/participants", async (request, resposta) => {

    try{
        const membros = await listaParticipants.find().toArray();

        if (!membros){
            return resposta.sendStatus(404);
        }
        resposta.send(membros);
    }

    catch (erro){
        console.log(erro);
        resposta.sendStatus(500);
    }
});

// "/messages"
app.post("/messages", async (request, resposta) => {
    const {to, text, type} = request.body;
    const {username} = request.headers;
    const menssagem = {
        from: username,
        to, 
        text, 
        type,
        time: dayjs().format("HH:MM:SS"),
    }

    try {
        const {error} = listaMessages.validate(menssagem, {abortEarly:false});

        if (error) {
            const erros = error.details.map(detail => detail.message) 
            return resposta.status(422).send(erros);
        }

        await listaMessages.insertOne(menssagem);
        resposta.sendStatus(201);
    } 
    
    catch (erro) {
        console.log(erro);
        resposta.sendStatus(500);
    }
});

app.get("/messages", async (request, resposta) => {
    const limit = Number(request.query.limit);
    const {username} = request.headers;

    try{

        const mensagens = await listaMessages.find({$or: [
            {from: username}, 
            {to: {$in: [
                username, 
                "todos"
            ]}}, 
            {type:"message"}
        ]}).toArray();

        resposta.send(mensagens);
    }

    catch (erro) {
        console.log(erro);
        resposta.sendStatus(500);
    }
})

// "/status"
app.post("/status", async (request, resposta) => {
    const {username} = request.headers;

    //atualiza o timestamp do usuario
    try{
        const taOnline = await listaParticipants.findOne({name:username,});

        if (!taOnline){
            return resposta.sendStatus(404);
        }

        await listaParticipants.updateOne({name:username}, {$set:{lastStatus:Date.now()}});
    }

    catch (erro) {
        console.log(erro);
        resposta.sendStatus(500);
    }
})

//remove o usuario inativo a mais de 10sec
setInterval(async () => {
    const contagemDeDez = Date.now() - 10000;
    

    try{
        const usuarioInativo = listaParticipants.find({lastStatus:{$lte:contagemDeDez}}).toArray();

        //gera lista de inativos
        if (usuarioInativo.length > 1 ){
            const listaDeAFK = usuarioInativo.map(user => {
                return {
                    from: user.name,
                    to: "todos",
                    text: "quitou",
                    type: "status",
                    time: dayjs().format("HH:MM:SS"),
                };
            });

            //deleta participante inativo da lista
            await listaParticipants.deleteMany({lastStatus: {$lte: contagemDeDez}});
        }
    }

    catch (erro) {
        console.log(erro);
        resposta.sendStatus(500);
    }
}, 15000)



const PORTA = 5000;
app.listen (PORTA, () => console.log({PORTA}));