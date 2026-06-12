/** Minimal OpenAPI 3.0 spec for main public API routes. */
module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Korabi Travel API",
    version: "2.5.0",
    description: "Public routes for health, search, auth, marketplace, and orders.",
  },
  servers: [{ url: "/api", description: "Same origin" }],
  tags: [
    { name: "health", description: "Service status" },
    { name: "search", description: "Flight search" },
    { name: "auth", description: "Session auth" },
    { name: "marketplace", description: "Seat resale marketplace" },
    { name: "orders", description: "Flight booking orders" },
    { name: "payments", description: "Checkout payment intents" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["health"],
        summary: "Health and configuration status",
        responses: {
          200: {
            description: "ok, token_configured, live_mode, gemini_configured, loyalty, suppliers",
          },
        },
      },
    },
    "/suppliers": {
      get: {
        tags: ["health"],
        summary: "Supplier adapter status",
        responses: { 200: { description: "{ suppliers: [...] }" } },
      },
    },
    "/places": {
      get: {
        tags: ["search"],
        summary: "Airport/city autocomplete",
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } }],
        responses: { 200: { description: "{ places: [...] }" } },
      },
    },
    "/search": {
      post: {
        tags: ["search"],
        summary: "Search flights across suppliers",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["origin", "destination", "departure_date"],
                properties: {
                  origin: { type: "string", example: "LIS" },
                  destination: { type: "string", example: "BCN" },
                  departure_date: { type: "string", format: "date" },
                  return_date: { type: "string", format: "date", nullable: true },
                  adults: { type: "integer", default: 1 },
                  children_ages: { type: "array", items: { type: "integer" } },
                  cabin_class: { type: "string", default: "economy" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Search results with offers" },
          400: { description: "bad_search" },
          502: { description: "search_failed" },
          503: { description: "no_token" },
        },
      },
    },
    "/offers/{id}": {
      get: {
        tags: ["search"],
        summary: "Get offer details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Offer" }, 404: { description: "not_found" } },
      },
    },
    "/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Create account and start session",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "{ user }" },
          400: { description: "bad_input" },
          409: { description: "exists" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Sign in",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "{ user }" },
          401: { description: "bad_credentials" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["auth"],
        summary: "End session",
        security: [{ cookieAuth: [], csrf: [] }],
        responses: { 200: { description: "{ ok: true }" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["auth"],
        summary: "Current user",
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: "{ user }" } },
      },
    },
    "/marketplace/airlines": {
      get: {
        tags: ["marketplace"],
        summary: "Transferable airlines",
        responses: { 200: { description: "{ airlines: [...] }" } },
      },
    },
    "/marketplace/policy/{iata}": {
      get: {
        tags: ["marketplace"],
        summary: "Airline transfer policy",
        parameters: [{ name: "iata", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "{ policy }" }, 404: { description: "not_transferable" } },
      },
    },
    "/marketplace/listings": {
      get: {
        tags: ["marketplace"],
        summary: "Browse active listings",
        parameters: [
          { name: "origin", in: "query", schema: { type: "string" } },
          { name: "destination", in: "query", schema: { type: "string" } },
          { name: "airline", in: "query", schema: { type: "string" } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["soonest", "cheapest", "newest"] } },
        ],
        responses: { 200: { description: "{ listings: [...] }" } },
      },
      post: {
        tags: ["marketplace"],
        summary: "Create listing",
        security: [{ cookieAuth: [], csrf: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["airline_iata", "origin", "destination", "departing_at", "asking_price"],
                properties: {
                  airline_iata: { type: "string" },
                  origin: { type: "string" },
                  destination: { type: "string" },
                  departing_at: { type: "string", format: "date-time" },
                  asking_price: { type: "number" },
                  fare_paid: { type: "number" },
                  currency: { type: "string" },
                  pnr: { type: "string" },
                  orderId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "{ listing }" },
          400: { description: "not_eligible" },
        },
      },
    },
    "/marketplace/listings/{id}/buy": {
      post: {
        tags: ["marketplace"],
        summary: "Purchase listing (escrow hold)",
        security: [{ cookieAuth: [], csrf: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["passenger"],
                properties: {
                  passenger: {
                    type: "object",
                    required: ["given_name", "family_name"],
                    properties: {
                      given_name: { type: "string" },
                      family_name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "{ listing, escrow }" }, 404: { description: "not_found" } },
      },
    },
    "/marketplace/mine": {
      get: {
        tags: ["marketplace"],
        summary: "My selling and buying listings",
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: "{ selling, buying }" } },
      },
    },
    "/payments/intent": {
      post: {
        tags: ["payments"],
        summary: "Create checkout payment intent (Duffel or demo)",
        security: [{ csrf: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["offer_id", "amount", "currency"],
                properties: {
                  offer_id: { type: "string" },
                  amount: { type: "string" },
                  currency: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "{ payment_intent, mode }" } },
      },
    },
    "/payments/intent/{id}": {
      get: {
        tags: ["payments"],
        summary: "Refresh payment intent status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "{ payment_intent, mode }" } },
      },
    },
    "/payments/intent/{id}/confirm": {
      post: {
        tags: ["payments"],
        summary: "Confirm demo payment (simulated card)",
        security: [{ csrf: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "{ payment_intent }" } },
      },
    },
    "/orders": {
      post: {
        tags: ["orders"],
        summary: "Create flight order (guest or signed-in)",
        security: [{ csrf: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["offer_id", "passengers", "total_amount", "payment_intent_id"],
                properties: {
                  offer_id: { type: "string" },
                  payment_intent_id: { type: "string" },
                  passengers: { type: "array", items: { type: "object" } },
                  services: { type: "array", items: { type: "object" } },
                  total_amount: { type: "number" },
                  total_currency: { type: "string", default: "USD" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "{ order, booking, demo? }" },
          402: { description: "payment_required / payment_not_confirmed" },
          502: { description: "order_failed" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "korabi_session" },
      csrf: { type: "apiKey", in: "header", name: "x-csrf-token" },
    },
  },
};
