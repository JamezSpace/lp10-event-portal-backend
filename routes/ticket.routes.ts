import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function  ticketPlugin (fastify: FastifyInstance, opts: any) {
    // ticket download route
    fastify.get('/ticket', async (request: FastifyRequest, reply: FastifyReply) => {
        
    })
}