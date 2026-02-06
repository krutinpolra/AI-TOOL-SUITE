# Structured Outputs and JSON Schema

## Overview

Structured outputs are a technique for ensuring that Large Language Models (LLMs) return data in a predictable, machine-readable format. Instead of relying on prompt engineering and regex parsing to extract information from text responses, structured outputs use JSON Schema to enforce a strict data structure.

## The Problem with Unstructured Responses

When working with LLMs, one of the biggest challenges is non-determinism. Even with identical prompts, LLMs may produce different responses in both content and format. For example, asking "List 3 programming languages" might return:

- "Python, JavaScript, Java"
- "1. C++\n2. Ruby\n3. Go"
- "i) JavaScript ii) Python iii) TypeScript"

This variability makes it nearly impossible to build reliable software that depends on parsing LLM outputs.

## JSON Schema Solution

JSON Schema is a standardized way to describe the structure and data types of JSON documents. It acts as a contract between your application and the LLM, defining exactly what shape the response should take.

A JSON Schema includes:
- The `type` of each field (string, number, boolean, array, object)
- Whether fields are required or optional
- Descriptions that guide the LLM's understanding
- Validation rules like minimum/maximum values

## Validation Libraries

Instead of writing raw JSON Schema manually, developers typically use validation libraries:

- **Zod** (TypeScript): A TypeScript-first schema validation library with automatic type inference
- **Pydantic** (Python): Uses Python type hints to define and validate data models

These libraries provide a cleaner API and automatically generate the underlying JSON Schema needed by LLM providers.

## Benefits of Structured Outputs

1. **Guaranteed Format**: The LLM cannot return invalid JSON or miss required fields
2. **Type Safety**: Your code knows exactly what structure to expect
3. **No Parsing Errors**: Eliminates the need for fragile regex extraction
4. **Better Integration**: Makes LLM responses compatible with databases and APIs
5. **Reliable Testing**: Responses are consistent enough to write proper unit tests

## Important Limitation

While structured outputs guarantee the *format* of the response, they do not eliminate hallucinations or guarantee factual accuracy. The LLM can still generate incorrect content, just in a valid JSON structure. Prompt engineering and validation are still necessary.

## Use Cases

Common applications for structured outputs include:
- Data extraction from unstructured text
- Form filling and information gathering
- API responses that need to be stored in databases
- Multi-step reasoning with defined structure
- Classification and categorization tasks
