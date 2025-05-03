import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { configDotenv } from "dotenv";
import { zonesPlugin } from "./routes/zones.routes";
import { personsPlugin } from "./routes/persons.routes";
import { paymentPlugin } from "./routes/payments.routes";

configDotenv()
const fast = fastify({ logger: true })

// To prefix all endpoints with 'api', I created a general scopes function that houses the base endpoint and all other endpoints in their respective plugins
async function scopes(scope: FastifyInstance) {
    scope.get('/', async (_req: FastifyRequest, response: FastifyReply) => {
        return response.send('Hit the base endpoint!')
    })

    // register plugins
    scope.register(zonesPlugin, { prefix: 'zones' })
    scope.register(personsPlugin, { prefix: 'persons' })
    scope.register(paymentPlugin, { prefix: 'payments' })
}

fast.register(scopes, { prefix: '/api' })


// spin up the server
fast.listen({ port: Number(process.env?.PORT) || 4200 }, (err, address) => {
    if (err) {
        fast.log.error(err)
        process.exit(1)
    }

    fast.log.info(`Server running on port ${address}!`)
})