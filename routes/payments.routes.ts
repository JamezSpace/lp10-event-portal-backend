import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verfiyPayment } from "../controllers/payments.controller";
import { putPersons } from "../controllers/persons.controller";


async function markPersonsAsPaid(ids_array: string[]) {
    const result = await putPersons(ids_array, { hasPaid: true})

    if (result.message !== 'successful') return undefined

    return result.modifiedCount;
}

export async function paymentPlugin(fastify: FastifyInstance, opts: any) {
    // verify flutterwave payment
    fastify.post('/verify/:transaction_id', async (request: FastifyRequest<{ Params: { transaction_id: number }, Body: { amount: number, ids : string[] } }>, response: FastifyReply) => {
        const { transaction_id } = request.params;
        const { amount, ids } = request.body;
        
        const result = await verfiyPayment(transaction_id);       

        if (result.status === 'valid') {
            // Extra validation
            if (result.paymentData.amount !== amount || result.paymentData.currency !== 'NGN') {
              return response.code(400).send({ status: 'invalid', message: 'Amount or currency mismatch' });
            }
          
            // Mark persons as paid
            const updatedPerson = await markPersonsAsPaid(ids);
          
            if (!updatedPerson) {
              return response.code(404).send({ status: 'error', message: 'User not found' });
            }
          
            return response.code(200).send({ status: 'valid', payment: result.paymentData, user: updatedPerson });
          }
    })
}