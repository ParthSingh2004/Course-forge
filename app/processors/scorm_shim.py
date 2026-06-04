import re

def get_scorm_shim_js(course_id: str, scorm_version: str = "1.2") -> str:
    """
    Returns a self-contained JS string implementing the SCORM API shim.
    course_id: unique identifier baked into the localStorage key.
    scorm_version: "1.2" or "2004" — controls which API object name is primary.
    """
    # Sanitize course_id to keep it alphanumeric/underscores
    sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', course_id)
    
    return f"""(function() {{
    // Only install shim if no real LMS API is present
    if (typeof window.API === 'undefined' && typeof window.API_1484_11 === 'undefined') {{
        var startTime = new Date();
        var initialized = false;
        
        // Use an in-memory data store for the session
        var dataStore = {{}};
        
        // Ensure defaults are populated
        function setIfEmpty(key, defaultValue) {{
            if (dataStore[key] === undefined) {{
                dataStore[key] = defaultValue;
            }}
        }}
        
        // SCORM 1.2 defaults
        setIfEmpty("cmi.core.lesson_status", "not attempted");
        setIfEmpty("cmi.core.score.raw", "");
        setIfEmpty("cmi.core.session_time", "");
        
        // SCORM 2004 defaults
        setIfEmpty("cmi.completion_status", "not attempted");
        setIfEmpty("cmi.success_status", "unknown");
        setIfEmpty("cmi.score.raw", "");
        setIfEmpty("cmi.session_time", "");
        
        // Expose global object
        window.CF_SCORM_DATA = dataStore;
        
        // Helper to mirror cross-version properties
        function syncField(element, value) {{
            if (element === "cmi.core.lesson_status") {{
                if (value === "passed") {{
                    dataStore["cmi.completion_status"] = "completed";
                    dataStore["cmi.success_status"] = "passed";
                }} else if (value === "failed") {{
                    dataStore["cmi.completion_status"] = "completed";
                    dataStore["cmi.success_status"] = "failed";
                }} else if (value === "completed") {{
                    dataStore["cmi.completion_status"] = "completed";
                }} else if (value === "incomplete") {{
                    dataStore["cmi.completion_status"] = "incomplete";
                }}
            }} else if (element === "cmi.completion_status") {{
                if (value === "completed") {{
                    if (dataStore["cmi.core.lesson_status"] !== "passed" && dataStore["cmi.core.lesson_status"] !== "failed") {{
                        dataStore["cmi.core.lesson_status"] = "completed";
                    }}
                }} else if (value === "incomplete") {{
                    dataStore["cmi.core.lesson_status"] = "incomplete";
                }} else if (value === "not attempted") {{
                    dataStore["cmi.core.lesson_status"] = "not attempted";
                }}
            }} else if (element === "cmi.success_status") {{
                if (value === "passed") {{
                    dataStore["cmi.core.lesson_status"] = "passed";
                }} else if (value === "failed") {{
                    dataStore["cmi.core.lesson_status"] = "failed";
                }}
            }} else if (element === "cmi.core.score.raw") {{
                dataStore["cmi.score.raw"] = value;
            }} else if (element === "cmi.score.raw") {{
                dataStore["cmi.core.score.raw"] = value;
            }}
        }}
        
        // Memory-only persist updates the UI
        function persist() {{
            // Pulse UI indicator
            var pulseBadge = document.getElementById("cf-offline-saved-indicator");
            if (pulseBadge) {{
                pulseBadge.classList.remove("pulse");
                // Trigger reflow to restart CSS animation
                void pulseBadge.offsetWidth;
                pulseBadge.classList.add("pulse");
            }}
            
            // Update offline UI text
            updateOfflineIndicator();
        }}
        
        function calculateSessionTime() {{
            var elapsedMs = new Date() - startTime;
            var totalSec = elapsedMs / 1000;
            
            // Format 1.2: HH:MM:SS
            var h12 = Math.floor(totalSec / 3600);
            var m12 = Math.floor((totalSec % 3600) / 60);
            var s12 = Math.floor(totalSec % 60);
            var hStr = (h12 < 10 ? "0" : "") + h12;
            var mStr = (m12 < 10 ? "0" : "") + m12;
            var sStr = (s12 < 10 ? "0" : "") + s12;
            dataStore["cmi.core.session_time"] = hStr + ":" + mStr + ":" + sStr;
            
            // Format 2004: PT#H#M#S
            dataStore["cmi.session_time"] = "PT" + h12 + "H" + m12 + "M" + s12 + "S";
        }}
        
        // SCORM 1.2 API Object
        var API_12 = {{
            LMSInitialize: function(val) {{
                startTime = new Date();
                initialized = true;
                return "true";
            }},
            LMSFinish: function(val) {{
                calculateSessionTime();
                persist();
                initialized = false;
                return "true";
            }},
            LMSGetValue: function(element) {{
                return (dataStore[element] !== undefined) ? String(dataStore[element]) : "";
            }},
            LMSSetValue: function(element, value) {{
                dataStore[element] = String(value);
                syncField(element, String(value));
                return "true";
            }},
            LMSCommit: function(val) {{
                persist();
                return "true";
            }},
            LMSGetLastError: function() {{
                return "0";
            }},
            LMSGetErrorString: function(code) {{
                return "";
            }},
            LMSGetDiagnostic: function(code) {{
                return "";
            }}
        }};
        
        // SCORM 2004 API Object
        var API_2004 = {{
            Initialize: function(val) {{
                startTime = new Date();
                initialized = true;
                return "true";
            }},
            Terminate: function(val) {{
                calculateSessionTime();
                persist();
                initialized = false;
                return "true";
            }},
            GetValue: function(element) {{
                return (dataStore[element] !== undefined) ? String(dataStore[element]) : "";
            }},
            SetValue: function(element, value) {{
                dataStore[element] = String(value);
                syncField(element, String(value));
                return "true";
            }},
            Commit: function(val) {{
                persist();
                return "true";
            }},
            GetLastError: function() {{
                return "0";
            }},
            GetErrorString: function(code) {{
                return "";
            }},
            GetDiagnostic: function(code) {{
                return "";
            }}
        }};
        
        // Expose APIs
        window.API = API_12;
        window.API_1484_11 = API_2004;
        
        // Global reset helper (just restarts the session fresh by reloading)
        window.CF_SCORM_RESET = function() {{
            location.reload();
        }};
        
        function updateOfflineIndicator() {{
            var compBadge = document.getElementById("cf-offline-completion-badge");
            var scoreDisplay = document.getElementById("cf-offline-score-display");
            
            if (compBadge) {{
                var status = dataStore["cmi.core.lesson_status"] || dataStore["cmi.completion_status"] || "not attempted";
                compBadge.textContent = status.toUpperCase();
                
                compBadge.className = "cf-offline-badge";
                if (status === "passed" || status === "completed") {{
                    compBadge.classList.add("passed");
                }} else if (status === "failed") {{
                    compBadge.classList.add("failed");
                }} else if (status === "incomplete") {{
                    compBadge.classList.add("incomplete");
                }}
            }}
            
            if (scoreDisplay) {{
                var rawScore = dataStore["cmi.core.score.raw"] || dataStore["cmi.score.raw"] || "";
                if (rawScore !== "") {{
                    scoreDisplay.textContent = "Score: " + rawScore + "%";
                    scoreDisplay.style.display = "inline";
                }} else {{
                    scoreDisplay.style.display = "none";
                }}
            }}
        }}
        
        document.addEventListener("DOMContentLoaded", function() {{
            var indicator = document.getElementById("cf-offline-indicator");
            if (indicator) {{
                indicator.style.display = "flex";
                updateOfflineIndicator();
            }}
        }});
    }}
}})();"""
