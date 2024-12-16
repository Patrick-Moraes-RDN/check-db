const { Client } = require("pg")
const dotenv = require("dotenv")

dotenv.config()

const client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { require: true, rejectUnauthorized: false },
})

// Conecta ao banco de dados, se necessário
async function connectClient() {
    if (!client._connected) {
        try {
            await client.connect()
            client._connected = true
        } catch (err) {
            throw new Error(
                "Erro ao conectar ao banco de dados: " + err.message
            )
        }
    }
}

// Insere o registro no banco de dados
async function selectRecord(DB, matricula) {
    try {
        await connectClient()
        const query = `SELECT * FROM ${DB} WHERE matricula = $1`
        const record = await client.query(query, [matricula])
        return record.rows[0]
    } catch (err) {
        throw new Error(
            "Erro ao verificar registro no banco de dados: " + err.message
        )
    }
}

// Verifica se os parâmetros necessários estão presentes
function validateParams(matricula) {
    const missingParams = []
    if (!matricula) missingParams.push("matricula")
    if (missingParams.length) {
        throw new Error(`Parâmetros ausentes: ${missingParams.join(", ")}`)
    }
}

// Função principal que valida o token e executa a lógica
async function main(params) {
    const DB = "poc_fleury_wa.colaboradores" // Nome do banco de dados

    const { matricula } = params

    try {
        validateParams(matricula)

        const record = await selectRecord(DB, matricula)
        console.log(record)
        return createResponse(200, record)
    } catch (err) {
        return handleError(err)
    } finally {
        try {
            await client.end()
            client._connected = false
        } catch (err) {
            console.error(
                "Erro ao encerrar conexão com o banco de dados: " + err.message
            )
        }
    }
}

// Middleware para lidar com erros de forma padronizada
function handleError(err) {
    console.error(err)

    if (err.message.includes("Parâmetros ausentes")) {
        return createResponse(400, err.message)
    }
    if (err.message.includes("Token inválido ou expirado")) {
        return createResponse(401, err.message)
    }
    if (
        err.message.includes("Erro ao verificar registro no banco de dados") ||
        err.message.includes("Erro ao conectar ao banco de dados")
    ) {
        return createResponse(500, err.message)
    }
    return createResponse(500, "Erro interno do servidor: " + err.message)
}

// Cria a resposta HTTP com código de status e mensagem
function createResponse(statusCode, message) {
    return {
        statusCode: statusCode,
        headers: { "Content-Type": "application/json" },
        body: message,
    }
}

module.exports.main = main

params = { matricula: "19102001" }
main(params)
