import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import OpeningAssessmentsCard from "../../components/shared/OpeningAssessmentsCard";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const DeadlinesPage = () => {
  const { notify } = useUi();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get(`${ENDPOINTS.courseworks}?deadline_state=open&page_size=50&ordering=deadline`)
      .then((res) => setRows(listRows(res.data)))
      .catch(() => notify("Could not load deadlines", "error"));
  }, []);

  return (
    <ListingPage title="My deadlines" icon={<EventAvailableRoundedIcon />} subtitle="Open assessments and due dates">
      <OpeningAssessmentsCard items={rows} title="Upcoming work" emptyText="No open deadlines." />
    </ListingPage>
  );
};

export default DeadlinesPage;
