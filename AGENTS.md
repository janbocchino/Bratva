- Mark every LLM-written code with the following wrapper:

```
// beginning of LLM written Code, Model: <Model>
// ... code ...
// end of LLM written Code
```

- Always reuse functions and be aware of overall project structure
- Don't write duplicate code
- Use best possible implementations; if there is a library (e.g. effect) to enhance code and make it shorter, ask for permission to use
- Use "bun test" for testing with Jest
