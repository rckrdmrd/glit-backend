// Quick test to verify validation schema
const Joi = require('joi');

const submitExerciseSchema = Joi.object({
  // Support both answer and answers for backward compatibility
  answer: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array(),
    Joi.object()
  ).optional(),
  answers: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array(),
    Joi.object()
  ).optional(),
  startedAt: Joi.alternatives().try(
    Joi.number(),
    Joi.date(),
    Joi.string()
  ).required(),
  hintsUsed: Joi.number().min(0).default(0),
  powerupsUsed: Joi.array().items(
    Joi.string().valid('pistas', 'vision_lectora', 'segunda_oportunidad')
  ).optional().default([]),
  comodinesUsed: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('pistas', 'vision_lectora', 'segunda_oportunidad').required(),
      count: Joi.number().min(1).required()
    })
  ).optional(),
  sessionId: Joi.string().optional(),
  attemptNumber: Joi.number().min(1).default(1)
}).or('answer', 'answers');

// Test payload from frontend
const testPayload = {
  "answers": {
    "order": [
      "event-1",
      "event-2",
      "event-3",
      "event-4"
    ]
  },
  "startedAt": 1761069396674,
  "hintsUsed": 0,
  "powerupsUsed": []
};

console.log('Testing validation with payload:');
console.log(JSON.stringify(testPayload, null, 2));

const { error, value } = submitExerciseSchema.validate(testPayload, {
  abortEarly: false,
  stripUnknown: true
});

if (error) {
  console.log('\n❌ VALIDATION FAILED:');
  console.log('Error:', error.message);
  console.log('\nDetails:');
  error.details.forEach(detail => {
    console.log(`  - Field: ${detail.path.join('.')} | Message: ${detail.message}`);
  });
} else {
  console.log('\n✅ VALIDATION PASSED!');
  console.log('\nValidated value:');
  console.log(JSON.stringify(value, null, 2));
}
