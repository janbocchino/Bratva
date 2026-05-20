// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- What admin view should exist with the first role implementation?
  - [x] Minimal protected landing page proving routing and layout boundaries.
  - [ ] User-management tools before the auth boundary is exercised.
*/
export default function AdminPage() {
  return (
    <section className='flex flex-col gap-3'>
      <h1 className='text-3xl font-semibold tracking-tight'>Admin</h1>
      <p className='text-sm text-black/70'>
        Admin tooling can be added here behind the same server-side role boundary.
      </p>
    </section>
  );
}
// end of LLM written Code
