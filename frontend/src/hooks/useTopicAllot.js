import { useState } from "react";

import { shouldAllotTopics } from "../utils/courseworkForm";

const useTopicAllot = () => {
  const [allotFor, setAllotFor] = useState(null);
  const openAfterSave = (saved) => {
    if (shouldAllotTopics(saved)) {
      setAllotFor(saved);
    }
  };
  return { allotFor, setAllotFor, openAfterSave };
};

export default useTopicAllot;
