import React, { useState, useEffect } from 'react';
import { Input, Button, Table, Typography } from 'antd';
import axios from 'axios';

const { Search } = Input;

const teamMapping = (teamNumber) => {
  switch (teamNumber) {
    case '1':
      return 'Legion';
    case '2':
      return 'Hellbourne';
    default:
      return 'Unknown';
  }
};

const DownloadButton = ({ s3_url, match_id }) => {
  const [state, setState] = useState('checking');
  const [error, setError] = useState('');

  const checkReplayExists = async () => {
    setError('');
    try {
      const response = await fetch(`/api-ui/check_replay_exists/${match_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`,
        },
      });
      if (response.ok) {
        setState('download');
      } else {
        throw new Error('Replay not found');
      }
    } catch (err) {
      setState('request');
    }
  };

  const requestReplay = async () => {
    setState('requesting');
    setError('');
    try {
      const res = await fetch(`/api-ui/request_replay/${match_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`,
        },
      });
      if (res.ok) {
        setState('download');
      } else {
        const errorResponse = await res.json();  // Assumes error response is a JSON object
        setError(`${errorResponse.message}`);  // errorResponse.message depends on your server's error structure
        setState('failed');
      }
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unknown error');
      setState('failed');
    }
  };

  const handleDownloadClick = () => {
    window.location.href = s3_url.replace('http:', 'https:');
  };

  useEffect(() => {
    checkReplayExists();
  }, [match_id]); // Include match_id as a dependency so useEffect runs whenever match_id changes

  if (state === 'checking') {
    return <p>Checking...</p>;
  } else if (state === 'request') {
    return <Button onClick={requestReplay}>Request</Button>;
  } else if (state === 'download') {
    return <Button onClick={handleDownloadClick}>Download</Button>;
  } else if (state === 'failed') {
    return <p>Error requesting replay: {error}</p>;
  } else if (state === 'requesting') {
    return <p>Requested. Please wait...</p>;
  }
};

const GameReplaysSearchPage = () => {
  const [loading, setLoading] = useState(false);
  const [replays, setReplays] = useState([]);
  const [searchCount, setSearchCount] = useState(0);  // New state for search count

  const onSearch = async (matchId) => {
    setLoading(true);
    setSearchCount(prevCount => prevCount + 1);  // Increment search count on every search
    try {
      const response = await fetch(`/api-ui/get_match_stats/${matchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`,
        },
      });
      const rawData = await response.json();

      //extract match summary from raw data
      const data = rawData["match_summ"];

      const replaysWithId = Object.values(data).map((matchData, index) => {
        // Remove fractional seconds
        const dateTimeParts = matchData['time'].split('.');
        const timeWithoutFractionalSeconds = dateTimeParts[0];

        // Create Date object
        const dateObject = new Date(`${matchData['date']} ${timeWithoutFractionalSeconds}`);

        // Format Date object to desired format
        const formattedDate = dateObject.toLocaleDateString();
        const formattedTime = dateObject.toLocaleTimeString();

        // Convert duration to HH:MM:SS format
        const durationSeconds = matchData['time_played'];
        const duration = new Date(durationSeconds * 1000).toISOString().substr(11, 8);

        return {
          key: index,
          name: matchData['name'],
          match_id: matchData['match_id'],
          date: `${formattedDate} ${formattedTime}`,
          winning_team: teamMapping(matchData['winning_team']),
          duration: duration,
          s3_url: matchData['s3_url'],  // Add s3_url to data
        };
      });

      setReplays(replaysWithId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  
const columns = [
  {
    title: 'Server Name',
    dataIndex: 'name',
  },
  {
    title: 'Match ID',
    dataIndex: 'match_id',
  },
  {
    title: 'Match Time',
    dataIndex: 'date',
  },
  {
    title: 'Winner',
    dataIndex: 'winning_team',
  },
  {
    title: 'Duration',
    dataIndex: 'duration',
  },
  {
    title: 'Download',
    dataIndex: 's3_url',
    render: (s3_url, record) => (
      // Use the search count in the key as well
      <DownloadButton key={`${record.match_id}-${searchCount}`} s3_url={s3_url} match_id={record.match_id} />
    ),
  }
]

  return (
    <div>
      <Search
        placeholder="Enter Match ID"
        enterButton="Search"
        size="large"
        onSearch={onSearch}
      />
      <Table
        columns={columns}
        dataSource={replays}
        loading={loading}
      />
    </div>
  );
};

export default GameReplaysSearchPage;