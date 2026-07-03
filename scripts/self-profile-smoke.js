const db = require("../src/db");
const editUser = require("../src/modules/users/edit-user");
const updateUserImage = require("../src/modules/users/update-user-image");

const ROLLBACK = "SELF_PROFILE_SMOKE_ROLLBACK";

const run = async () => {
  const client = await db.root("users").where({ role: "client", is_deleted: false }).first();
  if (!client)
    return console.log(JSON.stringify({ skipped: true, reason: "client user topilmadi" }));
  let result;
  try {
    await db.root.transaction(async (trx) => {
      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [
        String(client.company_id),
      ]);
      await db.runWithDatabase(trx, async () => {
        const edited = await editUser(
          {
            first_name: client.first_name,
            last_name: client.last_name,
            username: client.username,
            phone: client.phone,
          },
          { id: client.id },
          { id: client.id, role: client.role, company_id: client.company_id },
        );
        const image = await updateUserImage({
          id: client.id,
          user_image: client.user_image || "/uploads/self-profile-smoke.webp",
        });
        result = {
          role: client.role,
          self_edit: Boolean(edited.updated_user),
          self_image: Boolean(image.user),
        };
      });
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (error.message !== ROLLBACK) throw error;
  }
  result.rolled_back = true;
  console.log(JSON.stringify(result, null, 2));
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
