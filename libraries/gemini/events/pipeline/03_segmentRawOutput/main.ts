export async function segmentRawOutput(outputEvents, pipelineContext) {

//   const commonFields = {
//         id: crypto.randomUUID(),
//         type: event.type,
//         timestamp: new Date(),
//         user: context.user,
//         channel: context.channel,
//         // Gemini does not return the full parent event
//         parent: event.parent ? (await getEvents(event.parent.id))[0] : undefined,
//       };
  
//       if (event.type === BottEventType.ACTION_CALL) {
//         yield {
//           ...commonFields,
//           type: BottEventType.ACTION_CALL,
//           details: event.details as {
//             name: string;
//             options: O;
//             scores: Record<string, number>;
//           },
//         };
//       } else {
//         yield {
//           ...commonFields,
//           details: event.details as {
//             content: string;
//             scores: Record<string, number>;
//           },
//         };
//       }
// }
