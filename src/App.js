
import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { parseString } from 'xml2js';


const CLIENT_ID = "09e92192afa5b2fcf68b";
function App() {
  const [username, setUsername] = useState('');
  const [rerender, setRerender] = useState(false);
  const [userData, setUserData] = useState({});
  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const codeParam = urlParams.get("code");
    console.log(codeParam);

    // useLocal storage
    if (codeParam && window.localStorage.getItem("accessToken") === null) {
      async function getAccessToken() {
        try {
          const response = await axios.get(`http://localhost:4000/getAccessToken?code=${codeParam}`);
          const data = response.data;
          console.log(data);
          if (data.access_token) {
            window.localStorage.setItem("accessToken", data.access_token);
            setRerender(!rerender);
          }
        } catch (error) {
          console.error('Error fetching access token:', error);
        }
      }

      getAccessToken();
    }




  }, []);

  async function getUserData() {
    try {
      const response = await axios.get("http://localhost:4000/getUserData", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}` // Bearer + Access Token
        }
      });

      const data = response.data;
      console.log(data);
      setUserData(data);
      setUsername(data.login)

    } catch (error) {
      console.error('Error fetching user data:', error);
      // Handle errors as needed
    }
  }

  function onClickLoginHandler() {
    window.location.assign("https://github.com/login/oauth/authorize?client_id=" + CLIENT_ID);
  }
  // Function to fetch repositories for a user or organization
  async function fetchRepositories(username) {
    try {
      const response = await axios.get(`https://api.github.com/users/${username}/repos`);
      return response.data;
      
    } catch (error) {
      console.error('Error fetching repositories:', error);
      return [];
    }
  }

  // Function to fetch repository contents
  async function fetchRepositoryContents(owner, repo) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents`);
      return response.data;
      
    } catch (error) {
      console.error('Error fetching repository contents:', error);
      return [];
    }
  }

  // Function to parse pom.xml file
  async function parsePomXml(owner, repo, content) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${content.path}`);
      const xmlContent = Buffer.from(response.data.content, 'base64').toString('utf-8');

      parseString(xmlContent, (err, result) => {
        if (err) {
          console.error('Error parsing XML:', err);
          return;
        }

        const dependencies = result.project.dependencies[0].dependency;
        console.log(`Dependencies for ${owner}/${repo}:`);
        dependencies.forEach(dependency => {
          const groupId = dependency.groupId[0];
          const artifactId = dependency.artifactId[0];
          const version = dependency.version[0];
          console.log(`${groupId}:${artifactId} - Version ${version}`);
        });
      });
    } catch (error) {
      console.error('Error parsing pom.xml:', error);
    }
  }

  function onClickFetchRepositories(username) {
    fetchRepositories(username)
      .then(repositories => {
        if (repositories.length > 0) {
          console.log(repositories);
          const selectedRepo = repositories[0]; // Choose the first repository
          const { owner, name } = selectedRepo;
          fetchRepositoryContents(owner.login, name)
            .then(contents => {
              const pomXmlFiles = contents.filter(content => content.name === 'pom.xml');
              if (pomXmlFiles.length > 0) {
                parsePomXml(owner.login, name, pomXmlFiles[0]);
              } else {
                console.log('No pom.xml file found in the repository.');
              }
            })
            .catch(error => console.error('Error fetching repository contents:', error));
        } else {
          console.log('No repositories found.');
        }
      })
      .catch(error => console.error('Error fetching repositories:', error));
  }

  return (
    <div className="App">
      <header className="App-header">
        {localStorage.getItem("accessToken") ?
          <>
            <h1> we have the access_token</h1>
            <button onClick={() => { localStorage.removeItem("accessToken"); setRerender(!rerender); }}>
              Log out
            </button>
            <h3>Get user data form Github Api</h3>
            <button onClick={getUserData}> Get Data</button>
            {Object.keys(userData).length !== 0 ?
              <>
                <h4> Hey there {userData.login}</h4>
              </>
              :
              <>
              </>
            }
            <h3>Get dependencies  data from repos_url  </h3>
            <button onClick={onClickFetchRepositories(username)}>Get repo</button>
          </>
          :
          <>
            <h3> user is not logged in</h3>
            <button onClick={onClickLoginHandler}>
              Login with Github
            </button>
          </>
        }

      </header>
    </div>
  );
}

export default App;
