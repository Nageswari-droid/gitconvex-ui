import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { globalAPIEndpoint } from "../../../../../../util/env_config";
import InfiniteLoader from "../../../../../Animations/InfiniteLoader";

export default function FetchFromRemoteComponent(props) {
  library.add(fas);
  const { repoId, actionType } = props;

  const [remoteData, setRemoteData] = useState();
  const [isRemoteSet, setIsRemoteSet] = useState(false);
  const [isBranchSet, setIsBranchSet] = useState(false);
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const remoteRef = useRef();
  const branchRef = useRef();

  useEffect(() => {
    const cancelToken = axios.CancelToken;
    const source = cancelToken.source();

    axios({
      url: globalAPIEndpoint,
      method: "POST",
      cancelToken: source.token,
      headers: {
        "Content-type": "application/json",
      },
      data: {
        query: `
                query
                {
                    gitRepoStatus(repoId:"${props.repoId}") {
                      gitRemoteData
                      gitCurrentBranch
                      gitRemoteHost
                      gitBranchList 
                    }
                }
              `,
      },
    })
      .then((res) => {
        const repoDetails = res.data.data.gitRepoStatus;
        setRemoteData(repoDetails);
      })
      .catch((err) => {
        setLoading(false);
      });

    return () => {
      return source.cancel();
    };
  }, [props]);

  function remoteHostGenerator() {
    if (remoteData) {
      const { gitRemoteData } = remoteData;
      if (gitRemoteData.includes("||")) {
        return gitRemoteData.split("||").map((item) => {
          return (
            <option value={item} key={item}>
              {item}
            </option>
          );
        });
      } else {
        return <option>{gitRemoteData}</option>;
      }
    }
  }

  function branchListGenerator() {
    if (remoteData) {
      const { gitBranchList } = remoteData;

      return gitBranchList.map((branch) => {
        if (branch !== "NO_BRANCH") {
          return (
            <option value={branch} key={branch}>
              {branch}
            </option>
          );
        }
        return null;
      });
    }
  }

  function actionHandler(remote = "", branch = "") {
    setLoading(true);

    const getAxiosRequestBody = (remote, branch) => {
      let gqlQuery = "";
      if (actionType === "fetch") {
        gqlQuery = `mutation {
          fetchFromRemote(repoId: "${repoId}", remoteUrl: "${remote}", remoteBranch: "${branch}"){
            status
            fetchedItems
          }
        }
      `;
      } else {
        gqlQuery = `mutation {
          pullFromRemote(repoId: "${repoId}", remoteUrl: "${remote}", remoteBranch: "${branch}"){
            status
            pulledItems
          }
        }
      `;
      }

      return gqlQuery;
    };

    axios({
      url: globalAPIEndpoint,
      method: "POST",
      data: {
        query: getAxiosRequestBody(remote, branch),
      },
    })
      .then((res) => {
        setLoading(false);
        if (res.data.data && !res.data.error) {
          let actionResponse = {};

          if (actionType === "fetch") {
            actionResponse = res.data.data.fetchFromRemote;
          } else {
            actionResponse = res.data.data.pullFromRemote;
          }

          if (actionResponse.status.match(/ABSENT/gi)) {
            setResult([
              <div className="text-xl text-center border-2 border-dashed border-gray-800 p-2 text-gray-700 font-semibold">
                No changes to {actionType === "fetch" ? "Fetch" : "Pull"} from
                remote
              </div>,
            ]);
          } else if (actionResponse.status.match(/ERROR/gi)) {
            setResult([
              <div className="text-xl p-2 text-pink-800 border border-pink-200 shadow rounded font-semibold">
                Error while {actionType === "fetch" ? "Fetching" : "Pulling"}{" "}
                from remote!
              </div>,
            ]);
          } else {
            let resArray = [];
            if (actionType === "fetch") {
              resArray = actionResponse.fetchedItems;
            } else {
              resArray = actionResponse.pulledItems;
            }
            setResult([
              <div className="text-xl text-center border-2 border-dashed border-green-600 p-2 text-green-700 bg-green-200 font-semibold rounded shadow">
                {resArray[0]}
              </div>,
            ]);
          }
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
        setResult([
          <div className="text-xl p-2 text-pink-800 border border-pink-200 shadow rounded font-semibold">
            Error while {actionType === "fetch" ? "Fetching" : "Pulling"} from
            remote!
          </div>,
        ]);
      });
  }

  return (
    <>
      <div className="repo-backdrop--fetchpull">
        {actionType === "fetch" ? (
          <div
            className="fetchpull--fetch-global xl:w-3/5 lg:w-3/4 md:w-3/4 sm:w-11/12"
            onClick={() => {
              actionHandler();
            }}
          >
            <div className="text-2xl text-indigo-800 mx-4">
              <FontAwesomeIcon
                icon={["fas", "exclamation-circle"]}
              ></FontAwesomeIcon>
            </div>
            <div>Click to Fetch without branch selection</div>
          </div>
        ) : null}
        <div className="m-3 text-2xl font-sans text-gray-800">
          Available remote repos
        </div>
        <div>
          <select
            className="fetchpull--select"
            defaultValue="checked"
            disabled={remoteData ? false : true}
            onChange={() => {
              setIsRemoteSet(true);
            }}
            onClick={() => {
              setResult([]);
            }}
            ref={remoteRef}
          >
            <option disabled hidden value="checked">
              {remoteData
                ? "Select the remote repo"
                : "Loading available remotes..."}
            </option>
            {remoteData ? remoteHostGenerator() : null}
          </select>
        </div>

        {isRemoteSet ? (
          <div>
            <select
              className="fetchpull--select"
              defaultValue="checked"
              onChange={() => {
                setIsBranchSet(true);
              }}
              onClick={() => {
                setResult([]);
              }}
              ref={branchRef}
            >
              <option disabled hidden value="checked">
                Select upstream branch
              </option>
              {remoteData ? branchListGenerator() : null}
            </select>
          </div>
        ) : null}

        {isRemoteSet && isBranchSet && !loading ? (
          <div
            className="fetchpull--btn"
            onClick={(event) => {
              const remoteHost = remoteRef.current.value;
              const branchName = branchRef.current.value;

              if (remoteHost && branchName) {
                actionHandler(remoteHost, branchName);
              } else {
                event.target.style.display = "none";
              }
            }}
          >
            {actionType === "pull" ? "Pull from Remote" : null}
            {actionType === "fetch" ? "Fetch from Remote" : null}
          </div>
        ) : null}
        <div>
          {loading ? (
            <>
              <div className="fetchpull--loader">
                {actionType === "pull" ? "Pulling changes" : "Fetching"} from
                remote...
              </div>
              <div className="flex mx-auto my-6 text-center justify-center">
                <InfiniteLoader loadAnimation={loading}></InfiniteLoader>
              </div>
            </>
          ) : null}
        </div>

        {!loading && result && result.length > 0 ? (
          <>
            <div className="fetchpull--result">
              {result.map((result) => {
                return (
                  <div
                    className="my-1 mx-2 text-center text-xl font-sans shadow bg-gray-300"
                    key={result + `-${uuid()}`}
                  >
                    {result}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
