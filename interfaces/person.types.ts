import { Type, Static } from "@fastify/type-provider-typebox";

const person_schema = Type.Object({
    first_name: Type.String(),
    last_name: Type.String(),
    email: Type.String({format: 'email'}),
    year_of_birth: Type.Number({maximum: 2000, minimum: 2020}),
    gender: Type.String(),
    origin: Type.String(),
    parish: Type.String(),
    zone: Type.String(),
    region: Type.String(),    
    province: Type.String(),
    denomination: Type.String(),
    details: Type.String(),
    hasPaid: Type.Boolean({default: false}),
    transaction_ref: Type.String()
})

const payers_schema = Type.Object({
    payers_name: Type.String(),
    payers_email: Type.String({format: "email"})
})

export type Payer = Static<typeof payers_schema>

export type Person = Static<typeof person_schema>;

export {person_schema}