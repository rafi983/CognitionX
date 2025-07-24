import React, { useState, useEffect } from "react";
import {
  Play,
  Settings,
  Copy,
  Download,
  History,
  Zap,
  Code,
  BarChart3,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { ModelSelector } from "./playground/ModelSelector";
import { ParameterControls } from "./playground/ParameterControls";
import { PromptEditor } from "./playground/PromptEditor";
import { ResponseViewer } from "./playground/ResponseViewer";
import { MetricsDisplay } from "./playground/MetricsDisplay";
import { CodeGenerator } from "./playground/CodeGenerator";
import { TestHistory } from "./playground/TestHistory";
import { PresetManager } from "./playground/PresetManager";

export function APIPlayground({ models }) {
  // State for current test configuration
  const [selectedModel, setSelectedModel] = useState("");
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    systemPrompt: "",
  });
  const [prompt, setPrompt] = useState("");

  // State for test execution
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  // State for history and presets
  const [testHistory, setTestHistory] = useState([]);
  const [savedPresets, setSavedPresets] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState("test");
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);

  // Initialize with first model
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]);

  // Load saved data from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("playground_history");
    const savedPresets = localStorage.getItem("playground_presets");

    if (savedHistory) {
      try {
        setTestHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load test history:", e);
      }
    }

    if (savedPresets) {
      try {
        setSavedPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error("Failed to load presets:", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("playground_history", JSON.stringify(testHistory));
  }, [testHistory]);

  // Save presets to localStorage
  useEffect(() => {
    localStorage.setItem("playground_presets", JSON.stringify(savedPresets));
  }, [savedPresets]);

  const executeTest = async () => {
    if (!prompt.trim() || !selectedModel) {
      setError("Please provide a prompt and select a model");
      return;
    }

    setIsLoading(true);
    setError("");
    setResponse(null);
    setMetrics(null);

    const startTime = Date.now();

    try {
      const requestBody = {
        model: selectedModel,
        message: prompt,
        systemPrompt: parameters.systemPrompt,
        temperature: parameters.temperature,
        maxTokens: parameters.maxTokens,
        topP: parameters.topP,
        frequencyPenalty: parameters.frequencyPenalty,
        presencePenalty: parameters.presencePenalty,
      };

      const response = await fetch("/api/playground/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Request failed");
      }

      const data = await response.json();

      const testResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        model: selectedModel,
        parameters: { ...parameters },
        prompt,
        response: data.response,
        metrics: {
          responseTime,
          tokenCount: data.tokenCount || 0,
          characterCount: data.response.length,
          wordCount: data.response.split(" ").length,
        },
        success: true,
      };

      setResponse(data.response);
      setMetrics(testResult.metrics);

      // Add to history (keep last 50 tests)
      setTestHistory((prev) => [testResult, ...prev.slice(0, 49)]);
    } catch (err) {
      const errorResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        model: selectedModel,
        parameters: { ...parameters },
        prompt,
        error: err.message,
        success: false,
      };

      setError(err.message);
      setTestHistory((prev) => [errorResult, ...prev.slice(0, 49)]);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreset = (name, description) => {
    const preset = {
      id: Date.now().toString(),
      name,
      description,
      model: selectedModel,
      parameters: { ...parameters },
      prompt,
      timestamp: new Date().toISOString(),
    };

    setSavedPresets((prev) => [...prev, preset]);
  };

  const loadPreset = (preset) => {
    setSelectedModel(preset.model);
    setParameters(preset.parameters);
    setPrompt(preset.prompt);
  };

  const deletePreset = (presetId) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== presetId));
  };

  const clearHistory = () => {
    setTestHistory([]);
  };

  const loadFromHistory = (historyItem) => {
    setSelectedModel(historyItem.model);
    setParameters(historyItem.parameters);
    setPrompt(historyItem.prompt);
    if (historyItem.response) {
      setResponse(historyItem.response);
      setMetrics(historyItem.metrics);
    }
  };

  const tabs = [
    { id: "test", label: "Test", icon: Play },
    { id: "history", label: "History", icon: History },
    { id: "presets", label: "Presets", icon: Save },
    { id: "code", label: "Code", icon: Code },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex space-x-1 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {activeTab === "test" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* Model Selection */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Model Configuration
              </h3>
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>

            {/* Parameters */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                Parameters
              </h3>
              <ParameterControls
                parameters={parameters}
                onParametersChange={setParameters}
              />
            </div>

            {/* Prompt Editor */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                  <Code className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                  Prompt
                </h3>
                <button
                  onClick={executeTest}
                  disabled={isLoading || !prompt.trim() || !selectedModel}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>{isLoading ? "Testing..." : "Run Test"}</span>
                </button>
              </div>
              <PromptEditor
                prompt={prompt}
                onPromptChange={setPrompt}
                systemPrompt={parameters.systemPrompt}
                onSystemPromptChange={(value) =>
                  setParameters((prev) => ({ ...prev, systemPrompt: value }))
                }
              />
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            {/* Response */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
                Response
              </h3>
              <ResponseViewer
                response={response}
                isLoading={isLoading}
                error={error}
                onCopy={() => navigator.clipboard.writeText(response || "")}
              />
            </div>

            {/* Metrics */}
            {metrics && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                  Metrics
                </h3>
                <MetricsDisplay metrics={metrics} />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <TestHistory
          history={testHistory}
          onLoadFromHistory={loadFromHistory}
          onClearHistory={clearHistory}
        />
      )}

      {activeTab === "presets" && (
        <PresetManager
          presets={savedPresets}
          onSavePreset={savePreset}
          onLoadPreset={loadPreset}
          onDeletePreset={deletePreset}
          currentConfig={{
            model: selectedModel,
            parameters,
            prompt,
          }}
        />
      )}

      {activeTab === "code" && (
        <CodeGenerator
          model={selectedModel}
          parameters={parameters}
          prompt={prompt}
          response={response}
        />
      )}
    </div>
  );
}
