/**
 * Example with tool calling for Node.js
 */

import { SecureChatCompletion } from 'nomyo-js';

async function main() {
    const client = new SecureChatCompletion({
        baseUrl: 'https://api.nomyo.ai:12434'
    });

    try {
        console.log('Sending chat completion request with tools...');

        const response = await client.create({
            model: 'Qwen/Qwen3-0.6B',
            messages: [
                { role: 'user', content: "What's the weather like in Paris?" }
            ],
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'get_weather',
                        description: 'Get the current weather for a location',
                        parameters: {
                            type: 'object',
                            properties: {
                                location: {
                                    type: 'string',
                                    description: 'The city and country, e.g. Paris, France'
                                },
                                unit: {
                                    type: 'string',
                                    enum: ['celsius', 'fahrenheit'],
                                    description: 'Temperature unit'
                                }
                            },
                            required: ['location']
                        }
                    }
                }
            ],
            temperature: 0.7
        });

        console.log('\n📝 Response:');
        const message = response.choices[0].message;

        if (message.tool_calls) {
            console.log('🔧 Tool calls requested:');
            message.tool_calls.forEach((toolCall, index) => {
                console.log(`\n  ${index + 1}. ${toolCall.function.name}`);
                console.log(`     Arguments: ${toolCall.function.arguments}`);
            });
        } else {
            console.log(message.content);
        }

        console.log('\n📊 Usage:');
        console.log(`- Total tokens: ${response.usage?.total_tokens}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

main();
