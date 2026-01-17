import React from 'react';
import axios from 'axios';
import Map from './Map';

function App() {
  const [tests, setTests] = React.useState([]);

  React.useEffect(() => {
    axios
      .get('http://localhost:4000/test')
      .then(res => setTests(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>Test API</h1>
      <ul>
        {tests.map(t => (
          <li key={t.id}>{t.description}</li>
        ))}
      </ul>
      <Map />
    </div>
  );
}

export default App;

