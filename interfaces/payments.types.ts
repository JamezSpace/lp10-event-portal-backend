import { Type, Static } from "@fastify/type-provider-typebox";

const payment_schema = Type.Object({
    name: Type.String(),
    email: Type.String({format: "email"}),
    amount: Type.Number()
}),
 credo_payment_schema = Type.Object({
    last_name: Type.String(),
    email: Type.String({format: "email"}),
    amount: Type.Number(),
    event_id: Type.String(),
    payment_for: Type.Array(Type.String())
})

export type PaymentBody = Static<typeof payment_schema>;
export type CredoPaymentBody = Static<typeof credo_payment_schema>;

export {payment_schema, credo_payment_schema}
