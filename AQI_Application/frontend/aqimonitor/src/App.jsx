import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [city, setCity] = useState("Bihar");
  const [data, setData] = useState([]);
  const [input, setInput] = useState("Bihar");
  const [cities, setCities] = useState([]);


  const fetchData = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/aqi?city=${city}`);
      setData(res.data.records);
      console.log("Fetched data:", res.data);

    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  useEffect(() => {
    fetchData(); // initial fetch
    const interval = setInterval(fetchData, 120000); // refetch every 2 minutes
    return () => clearInterval(interval);
  }, [city]);

  useEffect(() => {
    axios.get("http://localhost:8000/cities").then((res) => {
      setCities(res.data.cities);
    });
  }, []);
  

  return (
    <div style={{ padding: "20px" }}>
      <h2>🌫️ Live AQI Dashboard</h2>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <select
  value={city}
  onChange={(e) => {
    setCity(e.target.value);
    setInput(e.target.value);
  }}
>

  {cities.map((c) => (
    <option key={c} value={c}>{c}</option>
  ))}
</select>

      <button onClick={() => setCity(input)}>Search</button>

      <table border="1" style={{ marginTop: "20px", width: "100%" }}>
        <thead>
          <tr>
            <th>Station</th>
            <th>Pollutant</th>
            <th>Avg AQI</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan="4">No data found.</td></tr>
          ) : (
            data.map((r, i) => (
              <tr key={i}>
                <td>{r.station}</td>
                <td>{r.pollutant_id}</td>
                <td>{r.avg_value}</td>
                <td>{r.last_update}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
