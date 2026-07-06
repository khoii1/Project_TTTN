BEGIN;

ALTER TABLE "quotes"
ADD COLUMN "name" VARCHAR(200);

UPDATE "quotes"
SET "name" = LEFT('Báo giá ' || "quote_number", 200)
WHERE "name" IS NULL OR BTRIM("name") = '';

ALTER TABLE "quotes"
ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_name_not_blank_check"
CHECK (CHAR_LENGTH(BTRIM("name")) BETWEEN 1 AND 200);

COMMIT;
