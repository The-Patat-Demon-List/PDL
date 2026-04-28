import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <table class="list" v-if="list">
                    <tr v-for="([level, err], i) in list">
                        <td class="rank">
                            <p v-if="i + 1 <= 100" class="type-label-lg">#{{ i + 1 }}</p>
                            <p v-else class="type-label-lg">Legacy</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                            <button @click="selected = i">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container">
                <div class="level" v-if="level">
                    <h1 style="display:flex; align-items:center; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <img :src="getDemonRating()" class="difficultyface" v-if="level && level.difficulty != null"/>
                            <span style="font-weight:600; font-size:1.1em;">{{ level.name }}</span>
                        </div>
                    </h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>

                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Patat's Enjoyment</div>
                            <p>{{ level.enjoyment != null ? level.enjoyment + '/10' : 'N/A'}}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Average Enjoyment</div>
                            <p>{{ averageEnjoyment != null ? averageEnjoyment + '/10' : 'N/A' }}</p>
                        </li>
                    </ul>

                    <h2>Records</h2>
                    <p v-if="selected + 1 <= 50"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected +1 <= 100"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>

                    <!--Table of records for levels-->
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="enjoyment">
                                <p>{{ record.user != 'Patat' ? (record.enjoyment != null ? record.enjoyment + '/10' : '') : (level.enjoyment != null ? level.enjoyment + '/10' : '') }}</p>
                            </td>
                            <!--
                            <td class="hz">
                                <p>{{ record.hz }}Hz</p>
                            </td>
                            -->
                        </tr>
                    </table>

                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <div class="og">
                        <p class="type-label-md">Website layout made by <a href="https://tsl.pages.dev/" target="_blank">TheShittyList</a></p>
                    </div>
                    <template v-if="editors">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                    <h3>Submission Requirements</h3>
                    <p>
                        - Easy/Medium demons: Screenshot of the endscreen is required (videos are also accepted, but not preferred)<br>
                        - Hard demons: Video is required (clicks optional)<br>
                        - Insane/Extreme demons: Video WITH CLICKS is required<br><br>

                        - Videos MUST SHOW a previous attempt and entire death animation before the completion, unless the completion is on the first attempt.<br>
                        - Videos must also show the endscreen.<br>
                        - Cheat indicators on the endscreen are REQUIRED unless the level is played on the vanilla game without mods<br><br>

                        - Only the level that is listed on the site is accepted for records - please check the level ID before submitting<br>
                        - Do not use secret routes that make the level significantly easier<br>
                        - Submissions for levels on the Legacy list will not be considered
                    </p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        errors: [],
        roleIconMap,
        store
    }),
    computed: {
        level() {
            return this.list[this.selected][0];
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
        averageEnjoyment() {
    if (!this.level || !this.level.records) return null;

    const values = this.level.records
        .map(r => {
            // Use level enjoyment for Patat
            if (r.user === 'Patat') {
                return this.level.enjoyment;
            }
            return r.enjoyment;
        })
        .filter(e => e != null);

    if (!values.length) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return avg.toFixed(2);
}
    },
    async mounted() {
        // Hide loading spinner
        this.list = await fetchList();
        this.editors = await fetchEditors();

        // Error handling
        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
        score,
        getDemonRating(){
            const currentLevel = this.level;
            if (!currentLevel || typeof currentLevel.difficulty === 'undefined') {
                return '';
            }
            const difficultyNames = ["Demon0", "Demon1", "Demon2", "Demon3", "Demon4"];
            if (difficultyNames[currentLevel.difficulty] + 1) {
                const name = difficultyNames[currentLevel.difficulty];
                return `/assets/${name}.png`;
            }
            return '';
        },
    },
};
