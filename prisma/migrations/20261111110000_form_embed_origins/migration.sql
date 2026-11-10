-- QA2 B39: sites allowed to embed the hosted form in an iframe (empty = nobody).
ALTER TABLE "organizations" ADD COLUMN "form_embed_origins" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
