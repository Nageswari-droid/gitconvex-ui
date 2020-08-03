import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  globalAPIEndpoint,
  ROUTE_REPO_DETAILS,
} from "../../../../../../util/env_config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";

import { v4 as uuid } from "uuid";

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
    let payload = JSON.stringify(JSON.stringify({ repoId: props.repoId }));
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
                query GitConvexApi
                {
                  gitConvexApi(route: "${ROUTE_REPO_DETAILS}", payload: ${payload}){
                    gitRepoStatus {
                      gitRemoteData
                      gitCurrentBranch
                      gitRemoteHost
                      gitBranchList 
                    }
                  }
                }
              `,
      },
    })
      .then((res) => {
        const repoDetails = res.data.data.gitConvexApi.gitRepoStatus;
        setRemoteData(repoDetails);
      })
      .catch((err) => {
        // console.log(err);
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
        gqlQuery = `mutation GitConvexMutation{
          fetchFromRemote(repoId: "${repoId}", remoteUrl: "${remote}", remoteBranch: "${branch}"){
            status
            fetchedItems
          }
        }
      `;
      } else {
        gqlQuery = `mutation GitConvexMutation{
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
              <div className="text-xl p-2 text-gray-900 font-semibold">
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
            setResult([...resArray]);
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
      <div className="w-3/4 mx-auto my-auto p-6 rounded shadow bg-white block">
        {actionType === "fetch" ? (
          <div
            className="flex justify-center items-center w-11/12 xl:w-3/5 lg:w-3/4 md:w-3/4 sm:w-11/12 mx-auto my-4 p-1 text-center border-b-2 border-dashed border-gray-400 text-lg font-sans font-medium cursor-pointer text-indigo-400 hover:text-indigo-600 rounded-lg hover:border-gray-600"
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
        <div className="m-3 text-2xl font-sans text-ghray-800">
          Available remote repos
        </div>
        <div>
          <select
            className="border p-3 my-4 text-xl rounded shadow"
            defaultValue="checked"
            onChange={() => {
              setIsRemoteSet(true);
            }}
            onClick={() => {
              setResult([]);
            }}
            ref={remoteRef}
          >
            <option disabled hidden value="checked">
              Select the remote repo
            </option>
            {remoteData ? remoteHostGenerator() : null}
          </select>
        </div>

        {isRemoteSet ? (
          <div>
            <select
              className="border p-3 my-4 text-xl rounded shadow"
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
            className="my-4 text-center bg-indigo-400 rounded shadow text-white text-xl font-sans p-2 mx-auto hover:bg-indigo-600 cursor-pointer"
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
            <div className="my-4 text-center border border-orange-800 text-orange-900 bg-orange-300 rounded shadow text-white text-xl font-sans p-2 mx-auto cursor-pointer">
              {actionType === "pull" ? "Pulling changes" : "Fetching"} from
              remote...
            </div>
          ) : null}
        </div>

        {!loading && result && result.length > 0 ? (
          <>
            <div className="p-3 rounded shadow bg-indigo-100 text-md font-sans text-gray-700 truncate">
              {result.map((result) => {
                return (
                  <div
                    className="my-1 mx-2 break-normal"
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
