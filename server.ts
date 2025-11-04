import fastify, {
	FastifyInstance,
	FastifyReply,
	FastifyRequest,
} from "fastify";
import fastifyCors from "@fastify/cors";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { zonesPlugin } from "./routes/zones.routes";
import { personsPlugin } from "./routes/persons.routes";
import { paymentPlugin } from "./routes/payments.routes";
import { connect_to_database, connect_to_redis } from "./utils/db.utils";
import { registrationPlugin } from "./routes/registrations.routes";

const fast = fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

// To prefix all endpoints with 'api', I created a general scopes function that houses the base endpoint and all other endpoints in their respective plugins
async function scopes(scope: FastifyInstance) {
	scope.get("/", async (_req: FastifyRequest, response: FastifyReply) => {
		return response.send("Hit the base endpoint!");
	});

	// register plugins
	scope.register(zonesPlugin, { prefix: "zones" });
	scope.register(personsPlugin, { prefix: "persons" });
	scope.register(paymentPlugin, { prefix: "payments" });
    scope.register(registrationPlugin, { prefix: "registrations" })
}

fast.register(fastifyCors, {
	origin: [`${process.env.FRONTEND_URL}`],
    methods: ['GET','POST','PUT', 'DELETE']
});
fast.register(scopes, { prefix: "/api" });

// connect to db
(async () => {
    try {
        await connect_to_database();
        await connect_to_redis();
    } catch (error) {
        console.error(error);
    }
})()

// spin up the server
fast.listen(
	{ port: Number(process.env?.PORT) || 4200, host: "0.0.0.0" },
	(err, address) => {
		if (err) {
			fast.log.error(err);
			process.exit(1);
		}

		fast.log.info(`Server running on port ${address}!`);
	}
);
