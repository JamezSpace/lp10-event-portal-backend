import { Type, Static } from "@fastify/type-provider-typebox";

const payment_schema = Type.Object({
    name: Type.String(),
    email: Type.String({format: "email"}),
    amount: Type.Number()
})

export type PaymentBody = Static<typeof payment_schema>;

export {payment_schema}
