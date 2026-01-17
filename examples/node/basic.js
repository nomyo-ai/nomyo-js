/**
 * Basic usage example for Node.js
 */

import { SecureChatCompletion } from 'nomyo-js';

async function main() {
    // Initialize client
    const client = new SecureChatCompletion({
        baseUrl: 'https://api.nomyo.ai:12434',
        // For local development, use:
        // baseUrl: 'http://localhost:12434',
        // allowHttp: true
    });

    try {
        // Simple chat completion
        console.log('Sending chat completion request...');

        const response = await client.create({
            model: 'Qwen/Qwen3-0.6B',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Hello! How are you today?' }
            ],
            temperature: 0.7
        });

        console.log('\n📝 Response:');
        console.log(response.choices[0].message.content);

        console.log('\n📊 Usage:');
        console.log(`- Prompt tokens: ${response.usage?.prompt_tokens}`);
        console.log(`- Completion tokens: ${response.usage?.completion_tokens}`);
        console.log(`- Total tokens: ${response.usage?.total_tokens}`);

        console.log('\n🔐 Security info:');
        console.log(`- Encrypted: ${response._metadata?.is_encrypted}`);
        console.log(`- Algorithm: ${response._metadata?.encryption_algorithm}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

main();
