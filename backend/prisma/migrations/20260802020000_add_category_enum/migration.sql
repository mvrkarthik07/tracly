-- Normalize known categories and log every invalid row before changing the column type.
DO $$
DECLARE
  remapped RECORD;
BEGIN
  UPDATE "Transaction"
  SET "category" = UPPER(BTRIM("category"))
  WHERE UPPER(BTRIM("category")) IN ('FOOD', 'TRANSPORT', 'BILLS', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH', 'INCOME', 'OTHER');

  FOR remapped IN
    SELECT "id", "category"
    FROM "Transaction"
    WHERE UPPER(BTRIM("category")) NOT IN ('FOOD', 'TRANSPORT', 'BILLS', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH', 'INCOME', 'OTHER')
  LOOP
    RAISE NOTICE 'Remapping transaction % with category % to OTHER', remapped."id", remapped."category";
    UPDATE "Transaction" SET "category" = 'OTHER' WHERE "id" = remapped."id";
  END LOOP;
END $$;

CREATE TYPE "Category" AS ENUM ('FOOD', 'TRANSPORT', 'BILLS', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH', 'INCOME', 'OTHER');

ALTER TABLE "Transaction"
  ALTER COLUMN "category" TYPE "Category"
  USING "category"::"Category";
