import { isFSA } from 'flux-standard-action';

function isPromise(val) {
  return val && typeof val.then === 'function';
}

let [RESOLVED_NAME, REJECTED_NAME] = [];

export function resolveType(actionName) {
  return actionName + RESOLVED_NAME;
}

export function rejectType(actionName) {
  return actionName + REJECTED_NAME;
}

export default function promiseMiddleware(resolvedName = '_RESOLVED', rejectedName = '_REJECTED') {
  [RESOLVED_NAME, REJECTED_NAME] = [resolvedName, rejectedName];

  return ({ dispatch }) => next => action => {

    if (!isFSA(action) || !action.payload || !isPromise(action.payload.promise)) {
      return next(action);
    }

    // (1) Dispatch actionName with payload with arguments apart from promise

    // Clone original action
    let newAction = {
      type: action.type,
      payload: {
        ...action.payload
      }
    };

    if (Object.keys(newAction.payload).length === 1) {
      // No arguments beside promise, remove all payload
      delete newAction.payload;
    } else {
      // Other arguments, delete promise only
      delete newAction.payload.promise;
    }

    dispatch(newAction);

    // (2) Listen to promise and dispatch payload with new actionName
    return new Promise((resolve, reject) => {

      action.payload.promise
      .then((result) => {
        dispatch({
          type: resolveType(action.type, resolvedName),
          payload: {
            // newAction payload without promise, only with original arguments, delete on last step
            ...newAction.payload,
            promise: result
          }
        });
        resolve(result);
        return result;
      })
      .catch((error) => {
        dispatch({
          type: rejectType(action.type, rejectedName),
          payload: {
            // newAction payload without promise, only with original arguments, delete on last step
            ...newAction.payload,
            promise: error
          }
        });
        reject(error);
        return error;
      });
    });
  };
}
