import { AsyncLocalStorage } from "node:async_hooks";

type ActorContext = {
  actorId: string;
};

const actorStorage = new AsyncLocalStorage<ActorContext>();

export function enterActor(actorId: string) {
  actorStorage.enterWith({ actorId });
}

export function currentActorId() {
  return actorStorage.getStore()?.actorId ?? null;
}
