import { triangleExtentFixture } from './triangle-extent';

/** Old Grid files draw two triangles per configured column but retained only half the graph. */
export function legacyTriangleFixture(snapshot = true) {
  const data = triangleExtentFixture();
  data.topologySettings!.useTopology = false;
  data.state.problem.numbers.clue.cellId = 'tri-2-7';
  if (!snapshot) {
    delete data.topologySettings!.topology;
    data.state.answer.vertexSurfaces = {};
  }
  return data;
}
