const baseURL = "http://localhost:5000";

export const saveListURL = (userID) => {
  if (userID) {
    return `${baseURL}/api/lists/${userID}`;
  }
};

export const getAllListURL = `${baseURL}/api/lists/getAllList`